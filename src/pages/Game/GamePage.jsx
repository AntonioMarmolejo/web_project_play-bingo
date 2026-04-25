import { useState } from 'react'
import styles from './GamePage.module.css'

const DEMO_CARD = [
  [15, 22, 41, 54, 71],
  [ 3, 32, 38, 60, 63],
  [ 9, 29,  0, 57, 75],
  [ 7, 17, 44, 48, 68],
  [14, 25, 35, 52, 11],
]

const DEMO_PLAYERS = ['Tú', 'María', 'Carlos', 'Ana']

export default function GamePage() {
  const [view, setView] = useState('lobby') // lobby | game
  const [joinCode, setJoinCode] = useState('')
  const [calledNums, setCalledNums] = useState([15, 32, 7, 48, 11])
  const [isAdmin] = useState(true)

  const callNumber = () => {
    const remaining = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !calledNums.includes(n)
    )
    if (!remaining.length) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setCalledNums((prev) => [...prev, pick])
  }

  if (view === 'lobby') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sala de <span>Juego</span></h1>
          <p className={styles.subtitle}>Crea una sala nueva o únete con un código</p>
        </div>

        <div className={styles.lobbyGrid}>
          {/* Crear sala */}
          <div className={styles.lobbyCard}>
            <div className={styles.lobbyIcon}>🏠</div>
            <h2 className={styles.lobbyCardTitle}>Crear Sala</h2>
            <p className={styles.lobbyCardDesc}>
              Serás el administrador. Se generará un código único para compartir.
            </p>
            <button className={styles.btnPrimary} onClick={() => setView('game')}>
              Crear nueva sala
            </button>
          </div>

          {/* Unirse */}
          <div className={styles.lobbyCard}>
            <div className={styles.lobbyIcon}>🚀</div>
            <h2 className={styles.lobbyCardTitle}>Unirse</h2>
            <p className={styles.lobbyCardDesc}>
              Ingresa el código que te compartió el administrador de la sala.
            </p>
            <div className={styles.joinRow}>
              <input
                className={styles.joinInput}
                placeholder="BINGO-XXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <button
                className={styles.btnPrimary}
                onClick={() => joinCode.length >= 4 && setView('game')}
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista de partida ──────────────────────────────────
  const lastNum = calledNums[calledNums.length - 1]

  return (
    <div className={styles.page}>
      <div className={styles.gameHeader}>
        <div>
          <span className={styles.roomCode}>BINGO-4821</span>
          <span className={styles.playerCount}>{DEMO_PLAYERS.length} jugadores</span>
        </div>
        <div className={styles.gameHeaderRight}>
          {isAdmin && (
            <button className={styles.btnCall} onClick={callNumber}>
              🎲 Cantar número
            </button>
          )}
          <button className={styles.btnLeave} onClick={() => setView('lobby')}>
            Salir
          </button>
        </div>
      </div>

      <div className={styles.gameLayout}>
        {/* Panel izquierdo — números cantados */}
        <div className={styles.numbersPanel}>
          <p className={styles.panelLabel}>NÚMEROS CANTADOS</p>
          <div className={styles.lastNum}>{lastNum ?? '—'}</div>
          <p className={styles.lastLabel}>Último</p>
          <div className={styles.numBubbles}>
            {calledNums.slice(0, -1).reverse().map((n) => (
              <span key={n} className={styles.numBubble}>{n}</span>
            ))}
          </div>
        </div>

        {/* Cartón central */}
        <div className={styles.cardPanel}>
          <p className={styles.panelLabel}>MI CARTÓN</p>
          <div className={styles.bingoCard}>
            {['B','I','N','G','O'].map((l) => (
              <div key={l} className={styles.colHeader}>{l}</div>
            ))}
            {DEMO_CARD.map((row, ri) =>
              row.map((num, ci) => {
                const isFree = ri === 2 && ci === 2
                const isMarked = isFree || calledNums.includes(num)
                const isLast = num === lastNum
                return (
                  <div
                    key={`${ri}-${ci}`}
                    className={`${styles.bingoCell} ${isMarked ? styles.marked : ''} ${isLast ? styles.lastMarked : ''} ${isFree ? styles.free : ''}`}
                  >
                    {isFree ? 'FREE' : num}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Panel derecho — jugadores */}
        <div className={styles.playersPanel}>
          <p className={styles.panelLabel}>JUGADORES ({DEMO_PLAYERS.length})</p>
          <div className={styles.playerList}>
            {DEMO_PLAYERS.map((name, i) => (
              <div key={name} className={`${styles.playerRow} ${i === 0 ? styles.meRow : ''}`}>
                <span
                  className={styles.playerDot}
                  style={{ background: i === 3 ? 'var(--muted)' : 'var(--accent3)' }}
                />
                {name}
                {i === 0 && <span className={styles.meTag}>Tú</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
