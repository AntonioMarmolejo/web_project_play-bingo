import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import { rooms as roomsApi } from '../../services/api'
import styles from './DashboardPage.module.css'

const STATUS_LABEL = {
  active:  { text: 'En juego',  color: 'var(--accent3)' },
  waiting: { text: 'Esperando', color: 'var(--accent4)' },
  ended:   { text: 'Terminada', color: 'var(--muted)' },
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [roomsList, setRoomsList] = useState([])
  const [stats, setStats] = useState({ cardsCount: 0, roomsPlayed: 0, bingosWon: 0, activeRooms: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roomsApi.myRooms()
      .then(({ rooms, stats }) => {
        setRoomsList(rooms)
        setStats(stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Hola, <span>{user?.name ?? 'Jugador'}</span>
          </h1>
          <p className={styles.subtitle}>¿Listo para jugar bingo?</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={() => navigate('/scan')}>
            + Cargar Cartón
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/game')}>
            ▶ Unirse / Crear Sala
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{loading ? '—' : stats.roomsPlayed}</span>
          <span className={styles.statLabel}>Partidas jugadas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{loading ? '—' : stats.bingosWon}</span>
          <span className={styles.statLabel}>Bingos ganados</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{loading ? '—' : stats.cardsCount}</span>
          <span className={styles.statLabel}>Cartones guardados</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{loading ? '—' : stats.activeRooms}</span>
          <span className={styles.statLabel}>Sala activa</span>
        </div>
      </div>

      {/* Rooms */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Mis Salas</h2>
        {loading && <p className={styles.emptyMsg}>Cargando...</p>}
        {!loading && roomsList.length === 0 && (
          <p className={styles.emptyMsg}>Todavía no has jugado ninguna partida.</p>
        )}
        <div className={styles.roomList}>
          {roomsList.map((room) => {
            const s = STATUS_LABEL[room.status]
            return (
              <div key={room.code} className={styles.roomCard}>
                <div className={styles.roomCode}>
                  <span className={styles.roomCodeText}>{room.code}</span>
                  <span
                    className={styles.statusBadge}
                    style={{ color: s.color, borderColor: s.color }}
                  >
                    {s.text}
                  </span>
                </div>
                <div className={styles.roomMeta}>
                  <span>{room.playersCount} jugadores · {room.calledCount} números</span>
                  <span>{formatDate(room.createdAt)}</span>
                </div>
                {room.status !== 'ended' && (
                  <button
                    className={styles.btnEnter}
                    onClick={() => navigate('/game')}
                  >
                    Entrar →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
