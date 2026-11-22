import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { requestAIAction } from './ai/aiClient';
import { soundEngine } from './audio/sound';
import { ChallengeMenu } from './components/ChallengeMenu';
import { GameBoard } from './components/GameBoard';
import { MainMenu } from './components/MainMenu';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { RulesModal } from './components/RulesModal';
import { VictoryModal } from './components/VictoryModal';
import { CHALLENGES } from './engine/data/challenges';
import { applyAction, createGame } from './engine/rules';
import { AIDifficulty, ExpansionConfig, GameAction, GameConfig, GameState } from './engine/types';
import { useOrientationLock } from './hooks/useOrientationLock';
import { MultiplayerClient } from './network/client';
import { RoomInfo } from './network/protocol';
import {
  ChallengeRecord,
  loadAutoGame,
  loadChallengeProgress,
  saveAutoGame,
  saveChallengeRecord,
} from './storage/progress';

type Screen = 'menu' | 'challenges' | 'multiplayer' | 'game';

export const App: React.FC = () => {
  const { isPortrait, requestLandscape } = useOrientationLock();

  const [screen, setScreen] = useState<Screen>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [challengeRecords, setChallengeRecords] = useState<Record<string, ChallengeRecord>>(() =>
    loadChallengeProgress()
  );
  const [savedGame, setSavedGame] = useState<GameState | null>(() => loadAutoGame());
  const [toastError, setToastError] = useState<string | null>(null);

  // Multiplayer state
  const [isMultiplayerGame, setIsMultiplayerGame] = useState(false);
  const [mpStatus, setMpStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    'disconnected'
  );
  const [serverUrl, setServerUrl] = useState('ws://localhost:8765');
  const [serverAddresses, setServerAddresses] = useState<string[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [mpRoom, setMpRoom] = useState<RoomInfo | null>(null);
  const [mpChat, setMpChat] = useState<
    Array<{ playerId: string; playerName: string; text: string; timestamp: number }>
  >([]);
  const [mpError, setMpError] = useState<string | null>(null);

  const mpClientRef = useRef<MultiplayerClient | null>(null);
  const aiGenerationRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToastError(msg);
    soundEngine.playError();
    setTimeout(() => setToastError((cur) => (cur === msg ? null : cur)), 2800);
  }, []);

  // Ensure MultiplayerClient instance
  const getMpClient = useCallback(() => {
    if (!mpClientRef.current) {
      mpClientRef.current = new MultiplayerClient({
        onStatusChange: (status) => {
          setMpStatus(status);
          if (status === 'disconnected') {
            setMpRoom(null);
            setServerAddresses([]);
          }
        },
        onWelcome: (pid, addrs) => {
          setMyPlayerId(pid);
          setServerAddresses(addrs);
        },
        onRoomUpdate: (room) => {
          setMpRoom(room);
          setMpError(null);
        },
        onGameState: (state) => {
          setGameState(state);
          setIsMultiplayerGame(true);
          setScreen('game');
        },
        onChat: (msg) => {
          setMpChat((prev) => [...prev.slice(-40), msg]);
        },
        onError: (msg) => {
          setMpError(msg);
          showToast(msg);
        },
        onRoomClosed: (reason) => {
          setMpRoom(null);
          setMpError(reason);
          setIsMultiplayerGame(false);
          setScreen('multiplayer');
        },
      });
    }
    return mpClientRef.current;
  }, [showToast]);

  useEffect(() => {
    return () => {
      mpClientRef.current?.disconnect();
    };
  }, []);

  // Persist local game autosave & challenge victory stars
  useEffect(() => {
    if (!gameState) return;

    if (!isMultiplayerGame) {
      saveAutoGame(gameState);
      setSavedGame(gameState.phase === 'finished' ? null : gameState);
    }

    if (gameState.phase === 'finished') {
      soundEngine.playVictory();
      if (gameState.challengeResult?.won && gameState.challengeResult.stars > 0) {
        saveChallengeRecord(
          gameState.challengeResult.challengeId,
          gameState.challengeResult.stars as 1 | 2 | 3,
          gameState.players[0].turnsTaken
        );
        setChallengeRecords(loadChallengeProgress());
      }
    }
  }, [gameState, isMultiplayerGame]);

  // Run AI turns asynchronously via Web Worker in local games
  useEffect(() => {
    if (!gameState || isMultiplayerGame || gameState.phase !== 'playing') {
      setAiThinking(false);
      return;
    }

    const active = gameState.players[gameState.currentPlayerIndex];
    if (!active?.isAI) {
      setAiThinking(false);
      return;
    }

    const gen = ++aiGenerationRef.current;
    setAiThinking(true);

    const delayMs = gameState.pendingQueue.length > 0 ? 280 : 420;
    const timer = setTimeout(() => {
      const budget = active.aiDifficulty === 'hard' ? 460 : 220;
      requestAIAction(gameState, active.aiDifficulty, budget)
        .then((action) => {
          if (aiGenerationRef.current !== gen) return;
          setGameState((prev) => {
            if (!prev || prev.phase !== 'playing') return prev;
            try {
              const next = applyAction(prev, action);
              if (action.type === 'buy_card') soundEngine.playBuyCard();
              else if (action.type === 'reserve_card') soundEngine.playReserve();
              else if (action.type === 'take_gems') soundEngine.playGemTake();
              return next;
            } catch {
              return prev;
            }
          });
        })
        .catch(() => {
          if (aiGenerationRef.current === gen) setAiThinking(false);
        });
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [gameState, isMultiplayerGame]);

  const handleStartLocalGame = (config: GameConfig) => {
    aiGenerationRef.current++;
    setIsMultiplayerGame(false);
    const initial = createGame(config);
    setGameState(initial);
    setScreen('game');
    requestLandscape();
  };

  const handleResumeSaved = () => {
    if (!savedGame) return;
    aiGenerationRef.current++;
    setIsMultiplayerGame(false);
    setGameState(savedGame);
    setScreen('game');
    requestLandscape();
  };

  const handleGameAction = (action: GameAction) => {
    if (!gameState) return;
    if (isMultiplayerGame) {
      getMpClient().send({ type: 'game_action', action });
      return;
    }
    try {
      const next = applyAction(gameState, action);
      setGameState(next);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '无法执行该操作');
    }
  };

  const handleExitGame = () => {
    aiGenerationRef.current++;
    setAiThinking(false);
    if (isMultiplayerGame) {
      getMpClient().send({ type: 'leave_room' });
      setMpRoom(null);
      setIsMultiplayerGame(false);
      setGameState(null);
      setScreen('multiplayer');
    } else {
      setGameState(null);
      setScreen('menu');
    }
  };

  const handleRematch = () => {
    if (!gameState) return;
    if (isMultiplayerGame) {
      handleExitGame();
      return;
    }
    handleStartLocalGame({
      ...gameState.config,
      seed: gameState.config.challenge ? gameState.config.seed : Date.now() & 0x7fffffff,
    });
  };

  const challengeStarsTotal = useMemo(
    () => Object.values(challengeRecords).reduce((s, r) => s + r.stars, 0),
    [challengeRecords]
  );

  return (
    <div className="app-root">
      {screen === 'menu' && (
        <MainMenu
          hasSavedGame={Boolean(savedGame)}
          challengeStarsTotal={challengeStarsTotal}
          challengeStarsMax={CHALLENGES.length * 3}
          onStartGame={handleStartLocalGame}
          onResumeGame={handleResumeSaved}
          onOpenChallenges={() => setScreen('challenges')}
          onOpenMultiplayer={() => {
            setMpError(null);
            setScreen('multiplayer');
          }}
          onOpenRules={() => setShowRules(true)}
        />
      )}

      {screen === 'challenges' && (
        <ChallengeMenu
          records={challengeRecords}
          onStartChallenge={handleStartLocalGame}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'multiplayer' && (
        <MultiplayerLobby
          connectionStatus={mpStatus}
          serverUrl={serverUrl}
          serverAddresses={serverAddresses}
          myPlayerId={myPlayerId}
          room={mpRoom}
          chatLog={mpChat}
          errorText={mpError}
          onChangeServerUrl={setServerUrl}
          onConnect={() => {
            setMpError(null);
            getMpClient()
              .connect(serverUrl)
              .catch((e) => setMpError(e instanceof Error ? e.message : String(e)));
          }}
          onDisconnect={() => getMpClient().disconnect()}
          onCreateRoom={(playerName, maxPlayers, expansions: ExpansionConfig) =>
            getMpClient().send({
              type: 'create_room',
              playerName,
              maxPlayers,
              expansions,
              targetPoints: 15,
            })
          }
          onJoinRoom={(code, playerName) =>
            getMpClient().send({ type: 'join_room', code, playerName })
          }
          onLeaveRoom={() => {
            getMpClient().send({ type: 'leave_room' });
            setMpRoom(null);
          }}
          onToggleReady={() => getMpClient().send({ type: 'toggle_ready' })}
          onAddAI={(difficulty: AIDifficulty) => getMpClient().send({ type: 'add_ai', difficulty })}
          onRemoveSeat={(playerId) => getMpClient().send({ type: 'remove_seat', playerId })}
          onUpdateConfig={(expansions, maxPlayers) =>
            getMpClient().send({
              type: 'update_config',
              expansions,
              targetPoints: 15,
              maxPlayers,
            })
          }
          onStartGame={() => getMpClient().send({ type: 'start_game' })}
          onSendChat={(text) => getMpClient().send({ type: 'chat', text })}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'game' && gameState && (
        <>
          <GameBoard
            state={gameState}
            localPlayerId={isMultiplayerGame ? myPlayerId ?? undefined : undefined}
            aiThinking={aiThinking}
            roomCode={isMultiplayerGame ? mpRoom?.code : undefined}
            onAction={handleGameAction}
            onExit={handleExitGame}
            onOpenRules={() => setShowRules(true)}
          />
          {gameState.phase === 'finished' && (
            <VictoryModal
              state={gameState}
              onRematch={handleRematch}
              onExit={handleExitGame}
            />
          )}
        </>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {toastError && <div className="toast-error">{toastError}</div>}

      {/* Landscape Orientation Guard Overlay for Portrait Phones */}
      {isPortrait && (
        <div className="portrait-guard">
          <RotateCw size={44} color="#f59e0b" />
          <h2>请将手机横向握持</h2>
          <p>《璀璨宝石》采用固定横屏桌面布局，完整还原 Steam 端宽屏视野与流畅触控。</p>
          <button type="button" className="btn btn--gold" onClick={requestLandscape}>
            尝试锁定横屏全屏
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
