import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/useGameStore'
import useAuthStore from '../../store/useAuthStore'
import useCardStore from '../../store/useCardStore'
import styles from './GamePage.module.css'

export default function GamePage() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const { cards, fetchCards } = useCardStore()
  const {
    room, players, calledNumbers, lastCalledNumber,
    gameStatus, winners, lastBingoClaim, error,
    initSocket, createRoom, joinRoom, selectCard,
    startGame, callNumber, claimBingo, leaveRoom, clearError,
  } = useGameStore()

  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [claimResult, setClaimResult] = useState(null) // null | 'valid' | 'invalid'
  const claimTimerRef = useRef(null)

  const isHost = room && user && room.hostId === user.id
  const myPlayer = players.find((p) => p.userId === user?.id)
  const myCard = cards.find((c) => c._id === (myPlayer?.cardId || selectedCardId))

  // Inicializa socket al montar
  useEffect(() => {
    if (token) initSocket(token)
  }, [token, initSocket])

  // Carga los cartones del usuario
  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  // Muestra resultado de reclamo de bingo brevemente
  useEffect(() => {
    if (!lastBingoClaim) return
    setClaimResult(lastBingoClaim.valid ? 'valid' : 'invalid')
    clearTimeout(claimTimerRef.current)
    claimTimerRef.current = setTimeout(() => setClaimResult(null), 3000)
  }, [lastBingoClaim])

  const handleError = (err) => {
    setActionError(err.message)
    setTimeout(() => setActionError(''), 3500)
  }

  // ── Acciones ──────────────────────────────────────────

  const handleCreateRoom = async () => {
    setLoading(true)
    try {
      await createRoom()
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (joinCode.trim().length < 4) return
    setLoading(true)
    try {
      await joinRoom(joinCode.trim())
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCard = async (cardId) => {
    setSelectedCardId(cardId)
    if (!room) return
    try {
      await selectCard(room.code, cardId)
    } catch (err) {
      handleError(err)
    }
  }

  const handleStartGame = async () => {
    setLoading(true)
    try {
      await startGame(room.code)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCallNumber = async () => {
    try {
      await callNumber(room.code)
    } catch (err) {
      handleError(err)
    }
  }

  const handleClaimBingo = async () => {
    const cardId = myPlayer?.cardId || selectedCardId
    if (!cardId) return handleError(new Error('Primero selecciona un cartón.'))
    try {
      await claimBingo(room.code, cardId)
    } catch (err) {
      handleError(err)
    }
  }

  const handleLeave = async () => {
    if (room) await leaveRoom(room.code)
    else navigate('/dashboard')
  }

  // ── Vista: LOBBY ──────────────────────────────────────
  if (gameStatus === 'idle') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sala de <span>Juego</span></h1>
          <p className={styles.subtitle}>Crea una sala nueva o únete con un código</p>
        </div>

        {(actionError || error) && (
          <p className={styles.errorBanner}>{actionError || error}</p>
        )}

        <div className={styles.lobbyGrid}>
          <div className={styles.lobbyCard}>
            <div className={styles.lobbyIcon}>🏠</div>
            <h2 className={styles.lobbyCardTitle}>Crear Sala</h2>
            <p className={styles.lobbyCardDesc}>
              Serás el anfitrión. Se generará un código único para compartir.
            </p>
            <button
              className={styles.btnPrimary}
              onClick={handleCreateRoom}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear nueva sala'}
            </button>
          </div>

          <div className={styles.lobbyCard}>
            <div className={styles.lobbyIcon}>🚀</div>
            <h2 className={styles.lobbyCardTitle}>Unirse</h2>
            <p className={styles.lobbyCardDesc}>
              Ingresa el código que te compartió el anfitrión.
            </p>
            <div className={styles.joinRow}>
              <input
                className={styles.joinInput}
                placeholder="XXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
              <button
                className={styles.btnPrimary}
                onClick={handleJoinRoom}
                disabled={loading || joinCode.trim().length < 4}
              >
                {loading ? '...' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista: SALA DE ESPERA ─────────────────────────────
  if (gameStatus === 'waiting') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sala de <span>Espera</span></h1>
          <p className={styles.subtitle}>
            Código:{' '}
            <span className={styles.codeHighlight}>{room?.code}</span>
            {' '}— comparte este código con los demás jugadores
          </p>
        </div>

        {(actionError || error) && (
          <p className={styles.errorBanner}>{actionError || error}</p>
        )}

        <div className={styles.waitingLayout}>
          {/* Jugadores conectados */}
          <div className={styles.waitingCard}>
            <p className={styles.panelLabel}>JUGADORES ({players.length})</p>
            <div className={styles.playerList}>
              {players.map((p) => (
                <div
                  key={p.userId}
                  className={`${styles.playerRow} ${p.userId === user?.id ? styles.meRow : ''}`}
                >
                  <span
                    className={styles.playerDot}
                    style={{ background: p.hasBingo ? 'var(--accent4)' : 'var(--accent3)' }}
                  />
                  <span>{p.name}</span>
                  {p.userId === user?.id && <span className={styles.meTag}>Tú</span>}
                  {p.userId === room?.hostId && <span className={styles.hostTag}>Host</span>}
                  {p.cardId && <span className={styles.cardTag}>✓ cartón</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Selector de cartón */}
          <div className={styles.waitingCard}>
            <p className={styles.panelLabel}>TU CARTÓN</p>
            {cards.length === 0 ? (
              <div className={styles.noCards}>
                <p>No tienes cartones guardados.</p>
                <button className={styles.btnPrimary} onClick={() => navigate('/scan')}>
                  Escanear cartón
                </button>
              </div>
            ) : (
              <div className={styles.cardList}>
                {cards.map((c) => {
                  const active = (myPlayer?.cardId || selectedCardId) === c._id
                  return (
                    <button
                      key={c._id}
                      className={`${styles.cardOption} ${active ? styles.cardOptionActive : ''}`}
                      onClick={() => handleSelectCard(c._id)}
                    >
                      <span className={styles.cardOptionName}>{c.name}</span>
                      <span className={styles.cardOptionType}>{c.sourceType}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className={styles.waitingActions}>
          {isHost && (
            <button
              className={styles.btnPrimary}
              onClick={handleStartGame}
              disabled={loading || players.length < 1}
            >
              {loading ? 'Iniciando...' : '¡Iniciar juego!'}
            </button>
          )}
          {!isHost && (
            <p className={styles.waitingHint}>Esperando a que el anfitrión inicie la partida…</p>
          )}
          <button className={styles.btnLeave} onClick={handleLeave}>Salir</button>
        </div>
      </div>
    )
  }

  // ── Vista: JUEGO ACTIVO ───────────────────────────────
  if (gameStatus === 'active') {
    const grid = myCard?.grid ?? null

    return (
      <div className={styles.page}>
        {/* Banner de resultado de bingo */}
        {claimResult && (
          <div className={`${styles.bingoBanner} ${claimResult === 'valid' ? styles.bingoValid : styles.bingoInvalid}`}>
            {claimResult === 'valid'
              ? `¡BINGO VÁLIDO! ${lastBingoClaim?.player} ganó 🎉`
              : `¡Falso bingo! ${lastBingoClaim?.player} aún no completa línea`}
          </div>
        )}

        <div className={styles.gameHeader}>
          <div>
            <span className={styles.roomCode}>{room?.code}</span>
            <span className={styles.playerCount}>{players.length} jugadores</span>
          </div>
          <div className={styles.gameHeaderRight}>
            {isHost && (
              <button className={styles.btnCall} onClick={handleCallNumber}>
                Cantar número
              </button>
            )}
            <button className={styles.btnBingo} onClick={handleClaimBingo}>
              ¡BINGO!
            </button>
            <button className={styles.btnLeave} onClick={handleLeave}>Salir</button>
          </div>
        </div>

        {actionError && <p className={styles.errorBanner}>{actionError}</p>}

        <div className={styles.gameLayout}>
          {/* Panel izquierdo — números cantados */}
          <div className={styles.numbersPanel}>
            <p className={styles.panelLabel}>NÚMEROS CANTADOS</p>
            <div className={styles.lastNum}>{lastCalledNumber ?? '—'}</div>
            <p className={styles.lastLabel}>Último</p>
            <div className={styles.numBubbles}>
              {[...calledNumbers].reverse().slice(1).map((n) => (
                <span key={n} className={styles.numBubble}>{n}</span>
              ))}
            </div>
          </div>

          {/* Cartón central */}
          <div className={styles.cardPanel}>
            <p className={styles.panelLabel}>MI CARTÓN</p>
            {grid ? (
              <div className={styles.bingoCard}>
                {['B', 'I', 'N', 'G', 'O'].map((l) => (
                  <div key={l} className={styles.colHeader}>{l}</div>
                ))}
                {grid.map((row, ri) =>
                  row.map((num, ci) => {
                    const isFree = num === null
                    const isMarked = isFree || calledNumbers.includes(num)
                    const isLast = num === lastCalledNumber
                    return (
                      <div
                        key={`${ri}-${ci}`}
                        className={[
                          styles.bingoCell,
                          isMarked ? styles.marked : '',
                          isLast ? styles.lastMarked : '',
                          isFree ? styles.free : '',
                        ].join(' ')}
                      >
                        {isFree ? 'FREE' : num}
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <p className={styles.noCardMsg}>
                No seleccionaste cartón en la sala de espera.
              </p>
            )}
          </div>

          {/* Panel derecho — jugadores */}
          <div className={styles.playersPanel}>
            <p className={styles.panelLabel}>JUGADORES ({players.length})</p>
            <div className={styles.playerList}>
              {players.map((p) => (
                <div
                  key={p.userId}
                  className={`${styles.playerRow} ${p.userId === user?.id ? styles.meRow : ''}`}
                >
                  <span
                    className={styles.playerDot}
                    style={{ background: p.hasBingo ? 'var(--accent4)' : 'var(--accent3)' }}
                  />
                  <span>{p.name}</span>
                  {p.userId === user?.id && <span className={styles.meTag}>Tú</span>}
                  {p.userId === room?.hostId && <span className={styles.hostTag}>Host</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista: JUEGO TERMINADO ────────────────────────────
  if (gameStatus === 'ended') {
    return (
      <div className={styles.page}>
        <div className={styles.endedContainer}>
          <div className={styles.endedIcon}>🎉</div>
          <h1 className={styles.endedTitle}>¡Juego terminado!</h1>
          {winners.length > 0 && (
            <p className={styles.endedWinners}>
              Ganador{winners.length > 1 ? 'es' : ''}:{' '}
              <strong>{winners.join(', ')}</strong>
            </p>
          )}
          <p className={styles.endedStats}>
            {calledNumbers.length} números cantados en total
          </p>
          <div className={styles.endedActions}>
            <button className={styles.btnPrimary} onClick={() => { leaveRoom(room?.code); }}>
              Nueva partida
            </button>
            <button className={styles.btnLeave} onClick={() => navigate('/dashboard')}>
              Ir al dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
