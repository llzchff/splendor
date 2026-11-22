import os from 'node:os';
import { WebSocket, WebSocketServer } from 'ws';
import { chooseAIAction } from '../src/ai/mcts';
import { applyAction, createGame } from '../src/engine/rules';
import { AIDifficulty, GameState } from '../src/engine/types';
import { ClientMessage, RoomInfo, RoomSeat, ServerMessage } from '../src/network/protocol';

interface ServerRoom {
  info: RoomInfo;
  state: GameState | null;
  sockets: Map<string, WebSocket>;
  aiTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, ServerRoom>();
const socketToMeta = new Map<WebSocket, { playerId: string; roomCode: string | null }>();

let nextId = 1;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${nextId++}`;
}

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? makeRoomCode() : code;
}

function getLocalAddresses(port: number): string[] {
  const result: string[] = [`ws://localhost:${port}`];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const addr of list ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        result.push(`ws://${addr.address}:${port}`);
      }
    }
  }
  return result;
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: ServerRoom, msg: ServerMessage): void {
  for (const ws of room.sockets.values()) {
    send(ws, msg);
  }
}

function scheduleAITurnIfNeeded(room: ServerRoom): void {
  if (room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = null;
  }
  if (!room.state || room.state.phase !== 'playing') return;

  const current = room.state.players[room.state.currentPlayerIndex];
  if (!current?.isAI) return;

  room.aiTimer = setTimeout(() => {
    if (!room.state || room.state.phase !== 'playing') return;
    const active = room.state.players[room.state.currentPlayerIndex];
    if (!active?.isAI) return;
    try {
      const aiMove = chooseAIAction(room.state, active.aiDifficulty, 320);
      room.state = applyAction(room.state, aiMove);
      broadcast(room, { type: 'game_state', state: room.state });
      scheduleAITurnIfNeeded(room);
    } catch (err) {
      broadcast(room, {
        type: 'error',
        message: `AI 行动异常: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, 550);
}

function removePlayerFromRoom(ws: WebSocket): void {
  const meta = socketToMeta.get(ws);
  if (!meta || !meta.roomCode) return;
  const room = rooms.get(meta.roomCode);
  meta.roomCode = null;
  if (!room) return;

  room.sockets.delete(meta.playerId);
  const seat = room.info.seats.find((s) => s.playerId === meta.playerId);

  if (room.info.status === 'playing') {
    if (seat) seat.connected = false;
    broadcast(room, { type: 'room_update', room: room.info });
    // If all human players disconnected, clean up room
    const anyConnected = room.info.seats.some((s) => !s.isAI && s.connected);
    if (!anyConnected) {
      if (room.aiTimer) clearTimeout(room.aiTimer);
      rooms.delete(room.info.code);
    }
    return;
  }

  // Lobby: remove seat
  room.info.seats = room.info.seats
    .filter((s) => s.playerId !== meta.playerId)
    .map((s, idx) => ({ ...s, seatIndex: idx }));

  const remainingHumans = room.info.seats.filter((s) => !s.isAI);
  if (remainingHumans.length === 0) {
    if (room.aiTimer) clearTimeout(room.aiTimer);
    rooms.delete(room.info.code);
    return;
  }

  if (room.info.hostPlayerId === meta.playerId) {
    room.info.hostPlayerId = remainingHumans[0].playerId;
  }
  broadcast(room, { type: 'room_update', room: room.info });
}

export function startSplendorServer(port = Number(process.env.PORT ?? 8765)): {
  wss: WebSocketServer;
  addresses: string[];
  close: () => Promise<void>;
} {
  const wss = new WebSocketServer({ port, host: '0.0.0.0' });
  const addresses = getLocalAddresses(port);

  wss.on('connection', (ws) => {
    const playerId = makeId('p');
    socketToMeta.set(ws, { playerId, roomCode: null });
    send(ws, { type: 'welcome', playerId, serverAddresses: addresses });

    ws.on('message', (raw) => {
      const meta = socketToMeta.get(ws);
      if (!meta) return;

      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(ws, { type: 'error', message: '无效的消息格式' });
        return;
      }

      switch (msg.type) {
        case 'create_room': {
          removePlayerFromRoom(ws);
          const code = makeRoomCode();
          const hostSeat: RoomSeat = {
            seatIndex: 0,
            playerId: meta.playerId,
            name: msg.playerName.trim() || '房主',
            isAI: false,
            aiDifficulty: 'medium',
            connected: true,
            ready: true,
            avatarIndex: 0,
          };
          const room: ServerRoom = {
            info: {
              code,
              hostPlayerId: meta.playerId,
              maxPlayers: Math.min(4, Math.max(2, msg.maxPlayers)),
              expansions: msg.expansions,
              targetPoints: msg.targetPoints || 15,
              status: 'lobby',
              seats: [hostSeat],
            },
            state: null,
            sockets: new Map([[meta.playerId, ws]]),
            aiTimer: null,
          };
          rooms.set(code, room);
          meta.roomCode = code;
          send(ws, { type: 'room_update', room: room.info });
          break;
        }

        case 'join_room': {
          const code = msg.code.trim().toUpperCase();
          const room = rooms.get(code);
          if (!room) {
            send(ws, { type: 'error', message: `房间 ${code} 不存在` });
            return;
          }

          // Reconnect support if playerId matches an existing disconnected seat
          if (msg.reconnectPlayerId) {
            const existing = room.info.seats.find(
              (s) => s.playerId === msg.reconnectPlayerId && !s.isAI
            );
            if (existing) {
              meta.playerId = existing.playerId;
              meta.roomCode = code;
              existing.connected = true;
              room.sockets.set(existing.playerId, ws);
              broadcast(room, { type: 'room_update', room: room.info });
              if (room.state) send(ws, { type: 'game_state', state: room.state });
              return;
            }
          }

          if (room.info.status !== 'lobby') {
            send(ws, { type: 'error', message: '对局已开始，无法加入新玩家' });
            return;
          }
          if (room.info.seats.length >= room.info.maxPlayers) {
            send(ws, { type: 'error', message: '房间人数已满' });
            return;
          }

          removePlayerFromRoom(ws);
          const seat: RoomSeat = {
            seatIndex: room.info.seats.length,
            playerId: meta.playerId,
            name: msg.playerName.trim() || `玩家 ${room.info.seats.length + 1}`,
            isAI: false,
            aiDifficulty: 'medium',
            connected: true,
            ready: false,
            avatarIndex: room.info.seats.length % 4,
          };
          room.info.seats.push(seat);
          room.sockets.set(meta.playerId, ws);
          meta.roomCode = code;
          broadcast(room, { type: 'room_update', room: room.info });
          break;
        }

        case 'leave_room': {
          removePlayerFromRoom(ws);
          break;
        }

        case 'toggle_ready': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.info.status !== 'lobby') return;
          const seat = room.info.seats.find((s) => s.playerId === meta.playerId);
          if (seat) {
            seat.ready = !seat.ready;
            broadcast(room, { type: 'room_update', room: room.info });
          }
          break;
        }

        case 'add_ai': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.info.status !== 'lobby') return;
          if (room.info.hostPlayerId !== meta.playerId) {
            send(ws, { type: 'error', message: '只有房主可以添加 AI 补位' });
            return;
          }
          if (room.info.seats.length >= room.info.maxPlayers) {
            send(ws, { type: 'error', message: '房间已满' });
            return;
          }
          const aiNames: Record<AIDifficulty, string> = {
            easy: '见习 AI',
            medium: '资深 AI',
            hard: '大师 AI',
          };
          const aiId = makeId('ai');
          room.info.seats.push({
            seatIndex: room.info.seats.length,
            playerId: aiId,
            name: `${aiNames[msg.difficulty]} #${room.info.seats.length}`,
            isAI: true,
            aiDifficulty: msg.difficulty,
            connected: true,
            ready: true,
            avatarIndex: room.info.seats.length % 4,
          });
          broadcast(room, { type: 'room_update', room: room.info });
          break;
        }

        case 'remove_seat': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.info.status !== 'lobby') return;
          if (room.info.hostPlayerId !== meta.playerId) return;
          if (msg.playerId === room.info.hostPlayerId) return;

          const kickedWs = room.sockets.get(msg.playerId);
          if (kickedWs) {
            send(kickedWs, { type: 'room_closed', reason: '你已被房主移出房间' });
            const km = socketToMeta.get(kickedWs);
            if (km) km.roomCode = null;
            room.sockets.delete(msg.playerId);
          }
          room.info.seats = room.info.seats
            .filter((s) => s.playerId !== msg.playerId)
            .map((s, idx) => ({ ...s, seatIndex: idx }));
          broadcast(room, { type: 'room_update', room: room.info });
          break;
        }

        case 'update_config': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.info.status !== 'lobby') return;
          if (room.info.hostPlayerId !== meta.playerId) return;
          room.info.expansions = msg.expansions;
          room.info.targetPoints = msg.targetPoints;
          room.info.maxPlayers = Math.max(room.info.seats.length, Math.min(4, Math.max(2, msg.maxPlayers)));
          broadcast(room, { type: 'room_update', room: room.info });
          break;
        }

        case 'start_game': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.info.status !== 'lobby') return;
          if (room.info.hostPlayerId !== meta.playerId) {
            send(ws, { type: 'error', message: '只有房主可以开始游戏' });
            return;
          }
          if (room.info.seats.length < 2) {
            send(ws, { type: 'error', message: '至少需要 2 名玩家（可添加 AI 补位）' });
            return;
          }
          room.info.status = 'playing';
          room.state = createGame({
            players: room.info.seats.map((s) => ({
              id: s.playerId,
              name: s.name,
              isAI: s.isAI,
              aiDifficulty: s.aiDifficulty,
              avatarIndex: s.avatarIndex,
            })),
            expansions: room.info.expansions,
            targetPoints: room.info.targetPoints,
            seed: Date.now() & 0x7fffffff,
          });
          broadcast(room, { type: 'room_update', room: room.info });
          broadcast(room, { type: 'game_state', state: room.state });
          scheduleAITurnIfNeeded(room);
          break;
        }

        case 'game_action': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.state || room.state.phase !== 'playing') return;
          const active = room.state.players[room.state.currentPlayerIndex];
          if (active.id !== meta.playerId) {
            send(ws, { type: 'error', message: '当前不是你的回合' });
            return;
          }
          try {
            room.state = applyAction(room.state, msg.action);
            broadcast(room, { type: 'game_state', state: room.state });
            scheduleAITurnIfNeeded(room);
          } catch (err) {
            send(ws, {
              type: 'error',
              message: err instanceof Error ? err.message : String(err),
            });
          }
          break;
        }

        case 'chat': {
          if (!meta.roomCode) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;
          const seat = room.info.seats.find((s) => s.playerId === meta.playerId);
          broadcast(room, {
            type: 'chat',
            playerId: meta.playerId,
            playerName: seat?.name ?? '玩家',
            text: msg.text.slice(0, 140),
            timestamp: Date.now(),
          });
          break;
        }
      }
    });

    ws.on('close', () => {
      removePlayerFromRoom(ws);
      socketToMeta.delete(ws);
    });
  });

  return {
    wss,
    addresses,
    close: () =>
      new Promise<void>((resolve) => {
        for (const r of rooms.values()) {
          if (r.aiTimer) clearTimeout(r.aiTimer);
        }
        rooms.clear();
        wss.close(() => resolve());
      }),
  };
}

// Run standalone if executed directly via `pnpm run server`
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('server\\index.ts') || process.argv[1].endsWith('server/index.ts'));

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 8765);
  const { addresses } = startSplendorServer(port);
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║      璀璨宝石 Splendor · 局域网/在线联机服务器已启动     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  for (const addr of addresses) {
    console.log(`║  地址: ${addr.padEnd(47)} ║`);
  }
  console.log('╚════════════════════════════════════════════════════════╝\n');
}
