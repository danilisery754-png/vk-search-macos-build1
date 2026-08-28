import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScaledOverlay from './ScaledOverlay'
import { UiScaleProvider } from './UiScaleContext'

function renderOverlay(element: ReactNode, scale = 2) {
  const root = document.createElement('div')
  root.id = 'app-overlay-root'
  document.body.appendChild(root)
  return render(<UiScaleProvider value={scale}>{element}</UiScaleProvider>)
}

afterEach(() => {
  document.getElementById('app-overlay-root')?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ScaledOverlay', () => {
  it('portals pointer menus into the shared app overlay root', async () => {
    renderOverlay(<ScaledOverlay point={{ x: 200, y: 120 }}><div data-testid="menu">Меню</div></ScaledOverlay>)
    const menu = await screen.findByTestId('menu')
    expect(document.getElementById('app-overlay-root')?.contains(menu)).toBe(true)
  })

  it('publishes logical viewport dimensions so portaled children cannot exceed the scaled window', async () => {
    renderOverlay(<ScaledOverlay point={{ x: 100, y: 100 }}><div data-testid="sized-menu">Меню</div></ScaledOverlay>, 2)
    const overlay = (await screen.findByTestId('sized-menu')).parentElement as HTMLElement
    expect(overlay.style.getPropertyValue('--logical-viewport-width')).toBe(`${window.innerWidth / 2}px`)
    expect(overlay.style.getPropertyValue('--logical-viewport-height')).toBe(`${window.innerHeight / 2}px`)
  })

  it('uses an anchor and keeps the overlay available when preferred left space is missing', async () => {
    const anchor = document.createElement('button')
    document.body.appendChild(anchor)
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({ x: 4, y: 300, left: 4, top: 300, right: 44, bottom: 340, width: 40, height: 40, toJSON: () => ({}) })

    renderOverlay(<ScaledOverlay anchor={anchor} placement="left-end"><div data-testid="anchored">Ответы</div></ScaledOverlay>, 1.5)
    const overlay = (await screen.findByTestId('anchored')).parentElement as HTMLElement
    expect(document.getElementById('app-overlay-root')?.contains(overlay)).toBe(true)
    expect(overlay.style.position).toBe('absolute')
    anchor.remove()
  })

  it('observes its own rendered size so asynchronously loaded menu content is re-clamped', async () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    const callback = { current: null as ResizeObserverCallback | null }
    class FakeResizeObserver {
      constructor(value: ResizeObserverCallback) { callback.current = value }
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    const view = renderOverlay(<ScaledOverlay point={{ x: 1180, y: 780 }}><div data-testid="dynamic-menu">Загрузка…</div></ScaledOverlay>, 2)
    const overlay = (await screen.findByTestId('dynamic-menu')).parentElement as HTMLElement
    expect(observe).toHaveBeenCalledWith(overlay)

    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON: () => ({}) })
    callback.current?.([], {} as ResizeObserver)
    expect(parseFloat(overlay.style.left)).toBeLessThan(590)
    expect(parseFloat(overlay.style.top)).toBeLessThan(390)

    view.unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
