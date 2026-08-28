import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountsPage, { normalizeVisualAccountOrder } from './AccountsPage'

const rows = [1, 2, 3].map(id => ({
  id, vk_user_id: 100 + id, first_name: `Имя${id}`, last_name: '', display_name: `Аккаунт ${id}`,
  profile_url: '', avatar_url: '', note: '', enabled: true, auth_status: 'ok', api_status: 'ok', session_status: 'ok', work_status: 'stopped',
  health_status: 'alive', health_detail: '', assigned_groups: 0, processed_count: 0, success_count: 0, failed_count: 0, unread_count: 0,
  last_checked_at: null, last_action_at: null, last_error: '',
}))

function json(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  const overlayRoot = document.createElement('div')
  overlayRoot.id = 'app-overlay-root'
  document.body.appendChild(overlayRoot)
  vi.stubGlobal('fetch', vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = String(request); const method = init?.method || 'GET'
    if (url.endsWith('/api/accounts') && method === 'GET') return json(rows)
    if (url.endsWith('/api/accounts/health/check') && method === 'POST') return json(rows)
    if (url.includes('/api/accounts/') && method === 'PATCH') return json({ ok: true })
    throw new Error(`Unexpected request: ${method} ${url}`)
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><AccountsPage /></QueryClientProvider>)
}

function cardNames() {
  return screen.getAllByTestId('account-card').map(card => within(card).getByRole('heading').textContent)
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  document.getElementById('app-overlay-root')?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AccountsPage v0.4.10 drag handle', () => {
  it('appends a newly discovered account to the saved visual order', () => {
    expect(normalizeVisualAccountOrder([3, 1, 2], [1, 2, 3, 4])).toEqual([3, 1, 2, 4])
  })

  it('makes only the explicit handle draggable', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(3))
    const card = screen.getAllByTestId('account-card')[0]
    expect(card).not.toHaveAttribute('draggable', 'true')
    const handle = within(card).getByTestId('account-drag-handle')
    expect(handle).toHaveAttribute('draggable', 'true')
    expect(handle).toHaveAccessibleName('Перетащить аккаунт Аккаунт 1')
  })

  it('reorders and persists only after a handle drag is dropped on another card', async () => {
    localStorage.setItem('vk-search.accounts.visual-order.v1', JSON.stringify([1, 2, 3]))
    renderPage()
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(3))
    const cards = screen.getAllByTestId('account-card')
    const handle = within(cards[0]).getByTestId('account-drag-handle')
    const data: Record<string, string> = {}
    const transfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: (type: string, value: string) => { data[type] = value },
      getData: (type: string) => data[type] || '',
    }
    fireEvent.dragStart(handle, { dataTransfer: transfer })
    expect(cardNames()).toEqual(['Аккаунт 1', 'Аккаунт 2', 'Аккаунт 3'])
    fireEvent.dragOver(cards[2], { dataTransfer: transfer })
    fireEvent.drop(cards[2], { dataTransfer: transfer })
    expect(cardNames()).toEqual(['Аккаунт 2', 'Аккаунт 3', 'Аккаунт 1'])
    expect(JSON.parse(localStorage.getItem('vk-search.accounts.visual-order.v1') || '[]')).toEqual([2, 3, 1])
  })

  it('portals the account action menu outside the card so scale and card overflow cannot clip it', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(3))
    const card = screen.getAllByTestId('account-card')[0]
    const trigger = within(card).getByRole('button', { name: 'Меню аккаунта Аккаунт 1' })
    fireEvent.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(document.getElementById('app-overlay-root')?.contains(menu)).toBe(true)
    expect(card.contains(menu)).toBe(false)
    expect(card).not.toHaveClass('account-card--dragging')
  })
})
