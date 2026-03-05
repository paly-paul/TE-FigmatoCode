import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ConversionResult {
  code: string
  language: string
}

export interface HistoryItem {
  id: string
  figmaUrl: string
  framework: string
  code: string
  createdAt: string
}

interface ConversionState {
  isConverting: boolean
  result: ConversionResult | null
  error: string | null
  history: HistoryItem[]
  convert: (figmaUrl: string, framework: string) => Promise<void>
  reset: () => void
  clearHistory: () => void
}

const FRAMEWORK_LANGUAGE_MAP: Record<string, string> = {
  React: 'tsx',
  Vue: 'vue',
  'HTML/CSS': 'html',
  'Tailwind CSS': 'html',
  'React Native': 'tsx',
}

function generateMockCode(framework: string, figmaUrl: string): string {
  const componentName = 'FigmaComponent'
  switch (framework) {
    case 'React':
    case 'React Native':
      return `import React from 'react'
import styles from './${componentName}.module.css'

// Generated from: ${figmaUrl}
interface ${componentName}Props {
  className?: string
}

export default function ${componentName}({ className }: ${componentName}Props) {
  return (
    <div className={\`\${styles.container} \${className ?? ''}\`}>
      <h2 className={styles.title}>Component Title</h2>
      <p className={styles.body}>Component body text goes here.</p>
    </div>
  )
}`
    case 'Vue':
      return `<template>
  <!-- Generated from: ${figmaUrl} -->
  <div class="container">
    <h2 class="title">Component Title</h2>
    <p class="body">Component body text goes here.</p>
  </div>
</template>

<script setup lang="ts">
// ${componentName}
</script>

<style scoped>
.container { padding: 1.5rem; }
.title { font-size: 1.5rem; font-weight: 700; }
.body { color: #64748b; }
</style>`
    default:
      return `<!-- Generated from: ${figmaUrl} -->
<div class="container">
  <h2 class="title">Component Title</h2>
  <p class="body">Component body text goes here.</p>
</div>

<style>
.container { padding: 1.5rem; }
.title { font-size: 1.5rem; font-weight: 700; }
.body { color: #64748b; }
</style>`
  }
}

export const useConversionStore = create<ConversionState>()(
  persist(
    (set, get) => ({
      isConverting: false,
      result: null,
      error: null,
      history: [],

      convert: async (figmaUrl, framework) => {
        set({ isConverting: true, error: null, result: null })
        try {
          // Simulate API call delay
          await new Promise((r) => setTimeout(r, 1500))

          const code = generateMockCode(framework, figmaUrl)
          const language = FRAMEWORK_LANGUAGE_MAP[framework] ?? 'txt'
          const result: ConversionResult = { code, language }

          const historyItem: HistoryItem = {
            id: crypto.randomUUID(),
            figmaUrl,
            framework,
            code,
            createdAt: new Date().toISOString(),
          }

          set((state) => ({
            isConverting: false,
            result,
            history: [historyItem, ...state.history],
          }))
        } catch {
          set({ isConverting: false, error: 'Conversion failed. Please check the Figma URL and try again.' })
        }
      },

      reset: () => set({ result: null, error: null }),

      clearHistory: () => {
        const { history } = get()
        if (history.length === 0) return
        set({ history: [] })
      },
    }),
    {
      name: 'figmatocode-history',
      partialize: (state) => ({ history: state.history }),
    }
  )
)
