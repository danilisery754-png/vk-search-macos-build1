import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { clampOverlayPosition, viewportToLogical, type OverlayPosition } from '../utils/uiScale'
import { useUiScale } from './UiScaleContext'

export type ScaledOverlayPlacement = 'left-end' | 'right-end' | 'bottom-start' | 'top-start'

interface ScaledOverlayProps extends PropsWithChildren {
  point?: { x: number; y: number } | null
  anchor?: HTMLElement | null
  placement?: ScaledOverlayPlacement
  gap?: number
  padding?: number
  className?: string
}

function preferredAnchorPoint(
  rect: DOMRect,
  overlayWidth: number,
  overlayHeight: number,
  placement: ScaledOverlayPlacement,
  gap: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
) {
  const fitsLeft = rect.left - gap - overlayWidth >= padding
  const fitsRight = rect.right + gap + overlayWidth <= viewportWidth - padding
  const fitsAbove = rect.top - gap - overlayHeight >= padding
  const fitsBelow = rect.bottom + gap + overlayHeight <= viewportHeight - padding

  if (placement === 'left-end') {
    const x = fitsLeft || !fitsRight ? rect.left - gap - overlayWidth : rect.right + gap
    return { x, y: rect.bottom - overlayHeight }
  }
  if (placement === 'right-end') {
    const x = fitsRight || !fitsLeft ? rect.right + gap : rect.left - gap - overlayWidth
    return { x, y: rect.bottom - overlayHeight }
  }
  if (placement === 'top-start') {
    const y = fitsAbove || !fitsBelow ? rect.top - gap - overlayHeight : rect.bottom + gap
    return { x: rect.left, y }
  }
  const y = fitsBelow || !fitsAbove ? rect.bottom + gap : rect.top - gap - overlayHeight
  return { x: rect.left, y }
}

export default function ScaledOverlay({
  point,
  anchor,
  placement = 'bottom-start',
  gap = 8,
  padding = 8,
  className,
  children,
}: ScaledOverlayProps) {
  const scale = useUiScale()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<OverlayPosition | null>(null)

  const measure = useCallback(() => {
    const element = overlayRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    let clientX = point?.x ?? 0
    let clientY = point?.y ?? 0

    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect()
      const preferred = preferredAnchorPoint(
        anchorRect,
        rect.width,
        rect.height,
        placement,
        gap,
        window.innerWidth,
        window.innerHeight,
        padding,
      )
      clientX = preferred.x
      clientY = preferred.y
    }

    setPosition(clampOverlayPosition({
      clientX,
      clientY,
      overlayWidth: rect.width,
      overlayHeight: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scale,
      padding,
    }))
  }, [anchor, gap, padding, placement, point?.x, point?.y, scale])

  useLayoutEffect(() => {
    measure()
    const refresh = () => measure()
    window.addEventListener('resize', refresh)
    window.addEventListener('scroll', refresh, true)

    const element = overlayRef.current
    const resizeObserver = typeof ResizeObserver !== 'undefined' && element
      ? new ResizeObserver(refresh)
      : null
    if (resizeObserver && element) resizeObserver.observe(element)

    return () => {
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', refresh, true)
      resizeObserver?.disconnect()
    }
  }, [measure])

  const root = document.getElementById('app-overlay-root')
  if (!root) return null

  const style = {
    position: 'absolute',
    left: position?.left ?? 0,
    top: position?.top ?? 0,
    visibility: position ? 'visible' : 'hidden',
    pointerEvents: 'auto',
    '--logical-viewport-width': `${viewportToLogical(window.innerWidth, scale)}px`,
    '--logical-viewport-height': `${viewportToLogical(window.innerHeight, scale)}px`,
  } as CSSProperties

  return createPortal(
    <div
      ref={overlayRef}
      className={`scaled-overlay${className ? ` ${className}` : ''}`}
      style={style}
      onPointerDown={event => event.stopPropagation()}
    >
      {children}
    </div>,
    root,
  )
}
