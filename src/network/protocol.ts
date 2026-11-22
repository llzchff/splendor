import { AIDifficulty, ExpansionConfig, GameAction, GameState } from '../engine/types';

export interface RoomSeat {
  seatIndex: number;
  playerId: string;
  name: string;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
  connected: boolean;
  ready: boolean;
  avatarIndex: number;
}

export interface RoomInfo {
  code: string;
  hostPlayerId: string;
  maxPlayers: number;
  expansions: ExpansionConfig;
  targetPoints: number;
  status: 'lobby' | 'playing';
  seats: RoomSeat[];
}

export type ClientMessage =
  | {
      type: 'create_room';
      playerName: string;
      maxPlayers: number;
      expansions: ExpansionConfig;
      targetPoints: number;
    }
  | { type: 'join_room'; code: string; playerName: string; reconnectPlayerId?: string }
  | { type: 'leave_room' }
  | { type: 'toggle_ready' }
  | { type: 'add_ai'; difficulty: AIDifficulty }
  | { type: 'remove_seat'; playerId: string }
  | { type: 'update_config'; expansions: ExpansionConfig; targetPoints: number; maxPlayers: number }
  | { type: 'start_game' }
  | { type: 'game_action'; action: GameAction }
  | { type: 'chat'; text: string };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; serverAddresses: string[] }
  | { type: 'room_update'; room: RoomInfo }
  | { type: 'game_state'; state: GameState }
  | { type: 'chat'; playerId: string; playerName: string; text: string; timestamp: number }
  | { type: 'error'; message: string }
  | { type: 'room_closed'; reason: string };
