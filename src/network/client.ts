import { ClientMessage, RoomInfo, ServerMessage } from './protocol';
import { GameState } from '../engine/types';

export interface MultiplayerCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void;
  onWelcome?: (playerId: string, serverAddresses: string[]) => void;
  onRoomUpdate?: (room: RoomInfo) => void;
  onGameState?: (state: GameState) => void;
  onChat?: (msg: { playerId: string; playerName: string; text: string; timestamp: number }) => void;
  onError?: (message: string) => void;
  onRoomClosed?: (reason: string) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  connect(url: string): Promise<void> {
    this.disconnect();
    this.callbacks.onStatusChange('connecting');

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        this.ws = ws;
        let settled = false;

        ws.onopen = () => {
          this.callbacks.onStatusChange('connected');
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(String(event.data)) as ServerMessage;
            this.handleMessage(msg);
          } catch {
            this.callbacks.onError?.('收到无法解析的服务器消息');
          }
        };

        ws.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error('无法连接到联机服务器，请检查地址与端口'));
          }
        };

        ws.onclose = () => {
          this.callbacks.onStatusChange('disconnected');
          this.ws = null;
        };
      } catch (err) {
        this.callbacks.onStatusChange('disconnected');
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'welcome':
        this.callbacks.onWelcome?.(msg.playerId, msg.serverAddresses);
        break;
      case 'room_update':
        this.callbacks.onRoomUpdate?.(msg.room);
        break;
      case 'game_state':
        this.callbacks.onGameState?.(msg.state);
        break;
      case 'chat':
        this.callbacks.onChat?.(msg);
        break;
      case 'error':
        this.callbacks.onError?.(msg.message);
        break;
      case 'room_closed':
        this.callbacks.onRoomClosed?.(msg.reason);
        break;
    }
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.('尚未连接到联机服务器');
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.onStatusChange('disconnected');
  }
}
