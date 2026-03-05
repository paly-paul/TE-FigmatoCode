import { describe, it, expect, beforeEach } from 'vitest'
import { useConversionStore } from '@/store/conversionStore'

beforeEach(() => {
  useConversionStore.setState({
    isConverting: false,
    result: null,
    error: null,
    history: [],
  })
})

describe('conversionStore', () => {
  it('starts with empty state', () => {
    const state = useConversionStore.getState()
    expect(state.isConverting).toBe(false)
    expect(state.result).toBeNull()
    expect(state.error).toBeNull()
    expect(state.history).toHaveLength(0)
  })

  it('adds entry to history after convert', async () => {
    await useConversionStore.getState().convert('https://figma.com/file/abc', 'React')
    const { history, result } = useConversionStore.getState()
    expect(history).toHaveLength(1)
    expect(history[0].figmaUrl).toBe('https://figma.com/file/abc')
    expect(history[0].framework).toBe('React')
    expect(result).not.toBeNull()
    expect(result?.language).toBe('tsx')
  })

  it('clears history', async () => {
    await useConversionStore.getState().convert('https://figma.com/file/abc', 'React')
    useConversionStore.getState().clearHistory()
    expect(useConversionStore.getState().history).toHaveLength(0)
  })

  it('resets result', async () => {
    await useConversionStore.getState().convert('https://figma.com/file/abc', 'Vue')
    useConversionStore.getState().reset()
    const { result, error } = useConversionStore.getState()
    expect(result).toBeNull()
    expect(error).toBeNull()
  })
})
