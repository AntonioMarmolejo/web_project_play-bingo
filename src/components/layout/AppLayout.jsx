import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/scan',      label: 'Escanear Cartón', icon: '⊡' },
  { to: '/game',      label: 'Sala de Juego', icon: '▶' },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoName}>Bingo<span>Scan</span></span>
          <span className={styles.logoSub}>v1.0</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          {user && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className={styles.userName}>{user.name}</div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            ⊘ Salir
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
