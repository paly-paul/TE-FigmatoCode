import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>TE FigmatoCode &copy; {new Date().getFullYear()} &mdash; SIXFE Frontend</p>
      </footer>
    </div>
  )
}
