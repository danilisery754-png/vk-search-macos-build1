import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Shell from './Shell'

const scaleMatrix = [.75, 1, 1.25, 1.5, 2, 2.5, 3]

function json(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function renderShell(scale: number) {
  vi.stubGlobal('fetch', vi.fn(async (request: RequestInfo | URL) => {
    const url = String(request)
    if (url.endsWith('/api/settings')) return json({ ui_scale: scale, navigation_order: ['/', '/accounts', '/groups', '/inbox', '/success', '/failed', '/logs'] })
    if (url.endsWith('/api/dashboard')) return json({ work_state: 'empty', metrics: { active_accounts: 0, remaining: 0, processing: 0, success: 0, failed: 0, unread: 0 }, events: [] })
    throw new Error(`Unexpected request: ${url}`)
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><Shell><div data-testid="child">content</div></Shell></MemoryRouter></QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Shell v0.4.10 full application scale', () => {
  it.each(scaleMatrix)('puts sidebar, topbar, workspace and overlay under the same scale layer at %s', async scale => {
    renderShell(scale)
    const layer = await screen.findByTestId('app-scale-layer')
    await waitFor(() => expect(layer.style.zoom).toBe(String(scale)))
    expect(parseFloat(layer.style.width)).toBeCloseTo(100 / scale, 2)
    expect(parseFloat(layer.style.height)).toBeCloseTo(100 / scale, 2)
    expect(layer.querySelector('.sidebar')).not.toBeNull()
    expect(layer.querySelector('.window-bar')).not.toBeNull()
    expect(layer.querySelector('main')).not.toBeNull()
    expect(layer.querySelector('#app-overlay-root')).not.toBeNull()
  })

  it('does not retain a work-area-only zoom wrapper', async () => {
    renderShell(2)
    const layer = await screen.findByTestId('app-scale-layer')
    await waitFor(() => expect(layer.style.zoom).toBe('2'))
    const oldRoot = layer.querySelector<HTMLElement>('.work-scale-root')
    expect(oldRoot?.style.zoom || '').toBe('')
  })
})
