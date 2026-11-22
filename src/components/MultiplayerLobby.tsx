import React, { useState } from 'react';
import { ArrowLeft, Bot, Copy, Play, Plus, Send, Trash2, Wifi, WifiOff } from 'lucide-react';
import { AIDifficulty, ExpansionConfig } from '../engine/types';
import { RoomInfo } from '../network/protocol';

interface MultiplayerLobbyProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  serverUrl: string;
  serverAddresses: string[];
  myPlayerId: string | null;
  room: RoomInfo | null;
  chatLog: Array<{ playerId: string; playerName: string; text: string; timestamp: number }>;
  errorText: string | null;
  onChangeServerUrl: (url: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCreateRoom: (playerName: string, maxPlayers: number, expansions: ExpansionConfig) => void;
  onJoinRoom: (code: string, playerName: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onAddAI: (diff: AIDifficulty) => void;
  onRemoveSeat: (playerId: string) => void;
  onUpdateConfig: (expansions: ExpansionConfig, maxPlayers: number) => void;
  onStartGame: () => void;
  onSendChat: (text: string) => void;
  onBack: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  connectionStatus,
  serverUrl,
  serverAddresses,
  myPlayerId,
  room,
  chatLog,
  errorText,
  onChangeServerUrl,
  onConnect,
  onDisconnect,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onAddAI,
  onRemoveSeat,
  onUpdateConfig,
  onStartGame,
  onSendChat,
  onBack,
}) => {
  const [playerName, setPlayerName] = useState('宝石旅人');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [expansions, setExpansions] = useState<ExpansionConfig>({
    orient: false,
    cities: false,
    tradingPosts: false,
    strongholds: false,
  });

  const isHost = Boolean(room && myPlayerId && room.hostPlayerId === myPlayerId);
  const mySeat = room?.seats.find((s) => s.playerId === myPlayerId);

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="subpage-screen">
      <header className="subpage-header">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            if (room) onLeaveRoom();
            onBack();
          }}
        >
          <ArrowLeft size={16} />
          返回大厅
        </button>
        <h2>局域网 / 在线联机大厅</h2>
        <div className={`conn-pill conn-pill--${connectionStatus}`}>
          {connectionStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>
            {connectionStatus === 'connected'
              ? '已连接服务器'
              : connectionStatus === 'connecting'
                ? '连接中…'
                : '未连接'}
          </span>
        </div>
      </header>

      {errorText && <div className="error-banner">{errorText}</div>}

      {!room ? (
        <div className="mp-grid">
          {/* Left: Server Connection */}
          <div className="mp-panel">
            <h3>1. 连接联机服务器</h3>
            <p className="mp-hint">
              在局域网电脑运行 <code>npm run server</code> 即可开启房间服；安卓手机与电脑连同一 Wi-Fi 后填写电脑局域网 IP（如 <code>ws://192.168.x.x:8765</code>）。
            </p>
            <div className="input-row">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => onChangeServerUrl(e.target.value)}
                placeholder="ws://192.168.1.100:8765"
                className="text-input"
              />
              {connectionStatus === 'connected' ? (
                <button type="button" className="btn btn--outline btn--sm" onClick={onDisconnect}>
                  断开
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--gold btn--sm"
                  disabled={connectionStatus === 'connecting'}
                  onClick={onConnect}
                >
                  连接
                </button>
              )}
            </div>

            {serverAddresses.length > 0 && (
              <div className="mp-addrs">
                <small>服务器广播地址（分享给同 Wi-Fi 手机）：</small>
                {serverAddresses.map((addr) => (
                  <code key={addr}>{addr}</code>
                ))}
              </div>
            )}

            <div className="config-group" style={{ marginTop: 10 }}>
              <label>你的联机昵称</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={14}
                className="text-input"
              />
            </div>
          </div>

          {/* Right: Create or Join Room */}
          <div className="mp-panel">
            <h3>2. 创建或加入房间</h3>
            <div className="mp-join-box">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="输入 6 位房间码"
                className="text-input text-input--code"
              />
              <button
                type="button"
                className="btn btn--gold btn--sm"
                disabled={connectionStatus !== 'connected' || joinCode.trim().length < 4}
                onClick={() => onJoinRoom(joinCode, playerName)}
              >
                加入房间
              </button>
            </div>

            <div className="mp-divider">或创建新房间</div>

            <div className="pill-group" style={{ marginBottom: 8 }}>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pill-btn ${maxPlayers === n ? 'pill-btn--active' : ''}`}
                  onClick={() => setMaxPlayers(n)}
                >
                  最多 {n} 人
                </button>
              ))}
            </div>

            <div className="mp-exp-row">
              {(
                [
                  ['orient', '东方'],
                  ['cities', '城市'],
                  ['tradingPosts', '贸易站'],
                  ['strongholds', '要塞'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`pill-btn ${expansions[key] ? 'pill-btn--active' : ''}`}
                  onClick={() => setExpansions((p) => ({ ...p, [key]: !p[key] }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn--gold"
              style={{ width: '100%', marginTop: 10 }}
              disabled={connectionStatus !== 'connected'}
              onClick={() => onCreateRoom(playerName, maxPlayers, expansions)}
            >
              <Plus size={16} />
              创建房间
            </button>
          </div>
        </div>
      ) : (
        <div className="mp-grid">
          {/* Room Seats & Host Controls */}
          <div className="mp-panel">
            <div className="mp-room-head">
              <div>
                <small>房间号</small>
                <div className="mp-code-display">
                  <strong>{room.code}</strong>
                  <button type="button" className="btn btn--ghost btn--xs" onClick={copyCode}>
                    <Copy size={13} />
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
              <button type="button" className="btn btn--ghost btn--xs" onClick={onLeaveRoom}>
                退出房间
              </button>
            </div>

            <div className="seat-list">
              {room.seats.map((seat) => (
                <div key={seat.playerId} className="seat-row">
                  <div className="seat-row__left">
                    <span className={`seat-dot ${seat.connected ? 'seat-dot--on' : ''}`} />
                    <strong>{seat.name}</strong>
                    {seat.playerId === room.hostPlayerId && <span className="tag-gold">房主</span>}
                    {seat.isAI && <span className="opp-card__ai-tag">AI</span>}
                  </div>
                  <div className="seat-row__right">
                    <span className={seat.ready ? 'ready-yes' : 'ready-no'}>
                      {seat.ready ? '已准备' : '未准备'}
                    </span>
                    {isHost && seat.playerId !== room.hostPlayerId && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => onRemoveSeat(seat.playerId)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isHost && (
              <div className="mp-host-controls">
                <div className="mp-exp-row">
                  {(
                    [
                      ['orient', '东方'],
                      ['cities', '城市'],
                      ['tradingPosts', '贸易站'],
                      ['strongholds', '要塞'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`pill-btn ${room.expansions[key] ? 'pill-btn--active' : ''}`}
                      onClick={() =>
                        onUpdateConfig(
                          { ...room.expansions, [key]: !room.expansions[key] },
                          room.maxPlayers
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {room.seats.length < room.maxPlayers && (
                  <div className="pill-group">
                    <button
                      type="button"
                      className="btn btn--outline btn--xs"
                      onClick={() => onAddAI('medium')}
                    >
                      <Bot size={13} /> +资深 AI
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline btn--xs"
                      onClick={() => onAddAI('hard')}
                    >
                      <Bot size={13} /> +大师 AI
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mp-room-actions">
              {isHost ? (
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={room.seats.length < 2}
                  onClick={onStartGame}
                >
                  <Play size={16} />
                  开始联机对局 ({room.seats.length}/{room.maxPlayers})
                </button>
              ) : (
                <button type="button" className="btn btn--gold" onClick={onToggleReady}>
                  {mySeat?.ready ? '取消准备' : '准备就绪'}
                </button>
              )}
            </div>
          </div>

          {/* Room Chat */}
          <div className="mp-panel mp-chat-panel">
            <h3>房间聊天</h3>
            <div className="chat-list">
              {chatLog.length === 0 ? (
                <div className="chat-empty">发送消息与房间内好友交流…</div>
              ) : (
                chatLog.map((m, idx) => (
                  <div key={idx} className="chat-row">
                    <strong>{m.playerName}：</strong>
                    <span>{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <form
              className="input-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                onSendChat(chatInput.trim());
                setChatInput('');
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="输入消息…"
                className="text-input"
              />
              <button type="submit" className="btn btn--gold btn--sm">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
