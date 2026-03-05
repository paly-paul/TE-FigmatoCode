import { Link } from 'react-router-dom'
import styles from './HomePage.module.css'

const features = [
  {
    icon: '🎨',
    title: 'Figma Integration',
    description: 'Connect your Figma designs via file URL or access token and convert them instantly.',
  },
  {
    icon: '⚡',
    title: 'Multiple Frameworks',
    description: 'Generate code for React, Vue, HTML/CSS, Tailwind CSS, and more.',
  },
  {
    icon: '📋',
    title: 'Clean Output',
    description: 'Production-ready, accessible, and well-structured code every time.',
  },
  {
    icon: '🕒',
    title: 'Conversion History',
    description: 'Review and re-download your past conversions at any time.',
  },
]

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Turn Figma Designs into{' '}
          <span className={styles.highlight}>Production Code</span>
        </h1>
        <p className={styles.heroSubtitle}>
          TE FigmatoCode converts your Figma components and frames into clean,
          framework-ready frontend code — in seconds.
        </p>
        <div className={styles.heroActions}>
          <Link to="/convert" className={styles.btnPrimary}>
            Start Converting
          </Link>
          <Link to="/history" className={styles.btnSecondary}>
            View History
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Why FigmatoCode?</h2>
        <div className={styles.grid}>
          {features.map((f) => (
            <div key={f.title} className={styles.card}>
              <span className={styles.cardIcon}>{f.icon}</span>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
