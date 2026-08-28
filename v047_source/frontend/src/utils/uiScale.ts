import type { CSSProperties } from 'react'

export const UI_SCALE_MIN = .75
export const UI_SCALE_MAX = 3

export function normalizeUiScale(value: unknown): number {
  const parsed = Number(value)
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number.isFinite(parsed) ? parsed : 1))
}

export function fullAppScaleStyle(scaleValue: number): CSSProperties {
  const scale = normalizeUiScale(scaleValue)
  const logicalPercent = `${100 / scale}%`
  return {
    '--ui-scale': String(scale),
    '--logical-viewport-width': `${100 / scale}vw`,
    '--logical-viewport-height': `${100 / scale}vh`,
    zoom: scale,
    width: logicalPercent,
    height: logicalPercent,
  } as CSSProperties
}

export function viewportToLogical(value: number, scaleValue: number): number {
  return value / normalizeUiScale(scaleValue)
}

export interface OverlayPositionInput {
  clientX: number
  clientY: number
  overlayWidth: number
  overlayHeight: number
  viewportWidth: number
  viewportHeight: number
  scale: number
  padding?: number
}

export interface OverlayPosition {
  left: number
  top: number
}

export function clampOverlayPosition(input: OverlayPositionInput): OverlayPosition {
  const scale = normalizeUiScale(input.scale)
  const padding = Math.max(0, input.padding ?? 8)
  const minLeft = padding / scale
  const minTop = padding / scale
  const maxLeft = Math.max(minLeft, (input.viewportWidth - padding - Math.max(0, input.overlayWidth)) / scale)
  const maxTop = Math.max(minTop, (input.viewportHeight - padding - Math.max(0, input.overlayHeight)) / scale)
  const desiredLeft = input.clientX / scale
  const desiredTop = input.clientY / scale

  return {
    left: Math.min(maxLeft, Math.max(minLeft, desiredLeft)),
    top: Math.min(maxTop, Math.max(minTop, desiredTop)),
  }
}
