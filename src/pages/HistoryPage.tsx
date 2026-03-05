import { useConversionStore } from '@/store/conversionStore'
import styles from './HistoryPage.module.css'

export default function HistoryPage() {
  const { history, clearHistory } = useConversionStore()

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📭</span>
        <p className={styles.emptyText}>No conversions yet.</p>
        <p className={styles.emptyHint}>
          Head to the <a href="/convert">Convert</a> page to get started.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Conversion History</h1>
        <button className={styles.clearBtn} onClick={clearHistory}>
          Clear All
        </button>
      </div>

      <ul className={styles.list}>
        {history.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemMeta}>
              <span className={styles.framework}>{item.framework}</span>
              <span className={styles.date}>
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <p className={styles.url} title={item.figmaUrl}>
              {item.figmaUrl}
            </p>
            <details className={styles.details}>
              <summary className={styles.summary}>View Code</summary>
              <pre className={styles.code}><code>{item.code}</code></pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}
