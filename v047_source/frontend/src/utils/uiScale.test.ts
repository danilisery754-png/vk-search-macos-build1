import { describe, expect, it } from 'vitest'
import { clampOverlayPosition, fullAppScaleStyle, normalizeUiScale, viewportToLogical } from './uiScale'

const matrix = [.75, 1, 1.25, 1.5, 2, 2.5, 3]

describe('v0.4.10 full-app scale math', () => {
  it.each(matrix)('uses one full-app scale source at %s', scale => {
    const style = fullAppScaleStyle(scale)
    expect(style.zoom).toBe(scale)
    expect(parseFloat(String(style.width))).toBeCloseTo(100 / scale, 4)
    expect(parseFloat(String(style.height))).toBeCloseTo(100 / scale, 4)
  })

  it('clamps persisted values to 75–300%', () => {
    expect(normalizeUiScale(.2)).toBe(.75)
    expect(normalizeUiScale(9)).toBe(3)
    expect(normalizeUiScale('bad')).toBe(1)
  })

  it('converts physical viewport pixels into scaled logical coordinates', () => {
    expect(viewportToLogical(600, 2)).toBe(300)
    expect(viewportToLogical(600, .75)).toBe(800)
  })

  it.each(matrix)('clamps a menu inside the physical viewport for scale %s', scale => {
    const result = clampOverlayPosition({
      clientX: 1190,
      clientY: 790,
      overlayWidth: 240,
      overlayHeight: 220,
      viewportWidth: 1200,
      viewportHeight: 800,
      scale,
      padding: 8,
    })
    expect(result.left).toBeGreaterThanOrEqual(8 / scale)
    expect(result.top).toBeGreaterThanOrEqual(8 / scale)
    expect((result.left * scale) + 240).toBeLessThanOrEqual(1192)
    expect((result.top * scale) + 220).toBeLessThanOrEqual(792)
  })

  it('keeps a top-left menu inside the padded viewport', () => {
    expect(clampOverlayPosition({
      clientX: -30,
      clientY: -20,
      overlayWidth: 180,
      overlayHeight: 120,
      viewportWidth: 1000,
      viewportHeight: 700,
      scale: 2,
      padding: 8,
    })).toEqual({ left: 4, top: 4 })
  })
})
