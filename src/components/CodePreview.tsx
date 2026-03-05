import { useState } from 'react'
import styles from './CodePreview.module.css'

interface CodePreviewProps {
  code: string
  language: string
}

export default function CodePreview({ code, language }: CodePreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.lang}>{language}</span>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
