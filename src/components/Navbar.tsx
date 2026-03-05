import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/convert', label: 'Convert', end: false },
  { to: '/history', label: 'History', end: false },
]

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <span className={styles.logo}>F2C</span>
        <span className={styles.title}>FigmatoCode</span>
      </div>
      <ul className={styles.links}>
        {navLinks.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.active : ''].join(' ')
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
