import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import styles from './DashboardPage.module.css'

const MOCK_ROOMS = [
  { id: '1', code: 'BINGO-4821', players: 6, status: 'active',  date: 'Hoy, 20:30' },
  { id: '2', code: 'BINGO-1190', players: 4, status: 'waiting', date: 'Hoy, 19:00' },
  { id: '3', code: 'BINGO-7731', players: 8, status: 'ended',   date: 'Ayer, 15:00' },
]

const STATUS_LABEL = {
  active:  { text: 'En juego',  color: 'var(--accent3)' },
  waiting: { text: 'Esperando', color: 'var(--accent4)' },
  ended:   { text: 'Terminada', color: 'var(--muted)' },
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

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
          <span className={styles.statNum}>3</span>
          <span className={styles.statLabel}>Partidas jugadas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>1</span>
          <span className={styles.statLabel}>Bingos ganados</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>7</span>
          <span className={styles.statLabel}>Cartones guardados</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>1</span>
          <span className={styles.statLabel}>Sala activa</span>
        </div>
      </div>

      {/* Rooms */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Mis Salas</h2>
        <div className={styles.roomList}>
          {MOCK_ROOMS.map((room) => {
            const s = STATUS_LABEL[room.status]
            return (
              <div key={room.id} className={styles.roomCard}>
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
                  <span>{room.players} jugadores</span>
                  <span>{room.date}</span>
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
