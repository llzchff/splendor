import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startSplendorServer } from './index';
import { ServerMessage } from '../src/network/protocol';

function connectClient(url: string): Promise<{
  ws: WebSocket;
  nextMessage: (predicate?: (m: ServerMessage) => boolean) => Promise<ServerMessage>;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue: ServerMessage[] = [];
    const waiters: Array<{
      pred?: (m: ServerMessage) => boolean;
      resolve: (m: ServerMessage) => void;
    }> = [];

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString()) as ServerMessage;
      const idx = waiters.findIndex((w) => !w.pred || w.pred(msg));
      if (idx !== -1) {
        const [w] = waiters.splice(idx, 1);
        w.resolve(msg);
      } else {
        queue.push(msg);
      }
    });

    ws.on('open', () => {
      resolve({
        ws,
        nextMessage: (pred) => {
          const qIdx = queue.findIndex((m) => !pred || pred(m));
          if (qIdx !== -1) {
            return Promise.resolve(queue.splice(qIdx, 1)[0]);
          }
          return new Promise<ServerMessage>((res, rej) => {
            const timer = setTimeout(() => rej(new Error('Timed out waiting for WS message')), 4000);
            waiters.push({
              pred,
              resolve: (m) => {
                clearTimeout(timer);
                res(m);
              },
            });
          });
        },
      });
    });

    ws.on('error', reject);
  });
}

describe('Authoritative LAN/Online WebSocket Server', () => {
  it('supports creating a room, joining by code, starting a match, and enforcing turn order', async () => {
    const port = 18765;
    const srv = startSplendorServer(port);

    try {
      const host = await connectClient(`ws://127.0.0.1:${port}`);
      const hostWelcome = await host.nextMessage((m) => m.type === 'welcome');
      expect(hostWelcome.type).toBe('welcome');

      host.ws.send(
        JSON.stringify({
          type: 'create_room',
          playerName: 'Host',
          maxPlayers: 2,
          expansions: { orient: false, cities: false, tradingPosts: false, strongholds: false },
          targetPoints: 15,
        })
      );

      const roomMsg = await host.nextMessage((m) => m.type === 'room_update');
      if (roomMsg.type !== 'room_update') throw new Error('Expected room_update');
      const code = roomMsg.room.code;
      expect(code).toHaveLength(6);

      const guest = await connectClient(`ws://127.0.0.1:${port}`);
      await guest.nextMessage((m) => m.type === 'welcome');
      guest.ws.send(JSON.stringify({ type: 'join_room', code, playerName: 'Guest' }));

      const joinedMsg = await host.nextMessage(
        (m) => m.type === 'room_update' && m.room.seats.length === 2
      );
      expect(joinedMsg.type).toBe('room_update');

      host.ws.send(JSON.stringify({ type: 'start_game' }));
      const stateHost = await host.nextMessage((m) => m.type === 'game_state');
      const stateGuest = await guest.nextMessage((m) => m.type === 'game_state');
      expect(stateHost.type).toBe('game_state');
      expect(stateGuest.type).toBe('game_state');

      // Guest attempts to act out of turn -> rejected
      guest.ws.send(
        JSON.stringify({
          type: 'game_action',
          action: { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } },
        })
      );
      const errMsg = await guest.nextMessage((m) => m.type === 'error');
      expect(errMsg.type).toBe('error');

      // Host acts legally -> synced to both clients
      host.ws.send(
        JSON.stringify({
          type: 'game_action',
          action: { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } },
        })
      );
      const updated = await guest.nextMessage((m) => m.type === 'game_state');
      if (updated.type !== 'game_state') throw new Error('Expected game_state');
      expect(updated.state.currentPlayerIndex).toBe(1);
      expect(updated.state.players[0].tokens.white).toBe(1);

      host.ws.close();
      guest.ws.close();
    } finally {
      await srv.close();
    }
  });
});
