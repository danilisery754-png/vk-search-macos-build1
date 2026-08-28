import { afterEach, describe, expect, it, vi } from 'vitest'
import { resizeTextarea } from './useAutoGrowTextarea'

afterEach(() => vi.restoreAllMocks())

function textarea(scrollHeight: number) {
  const element = document.createElement('textarea')
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight })
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '20px',
    paddingTop: '6px',
    paddingBottom: '6px',
  } as CSSStyleDeclaration)
  return element
}

describe('v0.4.10 composer auto-grow', () => {
  it('keeps a short message at one-line content height and hides the inner scrollbar', () => {
    const element = textarea(32)
    resizeTextarea(element)
    expect(element.style.height).toBe('32px')
    expect(element.style.overflowY).toBe('hidden')
  })

  it('grows with content until six lines then enables the inner scrollbar', () => {
    const element = textarea(180)
    resizeTextarea(element)
    expect(element.style.height).toBe('132px')
    expect(element.style.overflowY).toBe('auto')
  })

  it('does nothing when the ref is unavailable', () => {
    expect(() => resizeTextarea(null)).not.toThrow()
  })
})
