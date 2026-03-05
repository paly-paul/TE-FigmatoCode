import { useState } from 'react'
import { useConversionStore } from '@/store/conversionStore'
import CodePreview from '@/components/CodePreview'
import styles from './ConvertPage.module.css'

const FRAMEWORKS = ['React', 'Vue', 'HTML/CSS', 'Tailwind CSS', 'React Native'] as const
type Framework = (typeof FRAMEWORKS)[number]

export default function ConvertPage() {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [framework, setFramework] = useState<Framework>('React')
  const { isConverting, result, error, convert, reset } = useConversionStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!figmaUrl.trim()) return
    await convert(figmaUrl.trim(), framework)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Convert Figma to Code</h1>
        <p className={styles.subtitle}>
          Paste your Figma file URL and select a target framework to generate code.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="figmaUrl" className={styles.label}>
            Figma File URL
          </label>
          <input
            id="figmaUrl"
            type="url"
            className={styles.input}
            placeholder="https://www.figma.com/file/..."
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            required
            disabled={isConverting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Target Framework</label>
          <div className={styles.frameworkGrid}>
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw}
                type="button"
                className={[styles.frameworkBtn, framework === fw ? styles.selected : ''].join(' ')}
                onClick={() => setFramework(fw)}
                disabled={isConverting}
              >
                {fw}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.btnConvert} disabled={isConverting || !figmaUrl.trim()}>
            {isConverting ? 'Converting…' : 'Convert'}
          </button>
          {result && (
            <button type="button" className={styles.btnReset} onClick={reset}>
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {result && <CodePreview code={result.code} language={result.language} />}
    </div>
  )
}
