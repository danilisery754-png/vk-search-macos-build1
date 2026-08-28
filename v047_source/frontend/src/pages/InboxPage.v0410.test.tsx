import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UiScaleProvider } from '../components/UiScaleContext'
import InboxPage from './InboxPage'

const account = {
  id: 1, vk_user_id: 101, first_name: 'Иван', last_name: 'Иванов', display_name: 'Иван Иванов',
  profile_url: '', avatar_url: '', note: '', enabled: true, auth_status: 'ok', api_status: 'ok', session_status: 'ok', work_status: 'stopped',
  assigned_groups: 0, processed_count: 0, success_count: 0, failed_count: 0, unread_count: 0,
  last_checked_at: null, last_action_at: null, last_error: '',
}

const dialog = {
  id: 10, account_id: 1, account_name: 'Иван Иванов', peer_id: 500, title: 'Пётр', avatar_url: '', unread_count: 0,
  can_write: true, write_disabled_reason: '', last_message_at: '2026-08-27T17:40:00', last_message_preview: 'привет',
  last_message_outgoing: false, last_message_deleted: false, is_archived: false, archived_at: null, is_pinned: false, pinned_at: null, folder_ids: [],
}

const voice = {
  account_id: 1, dialog_id: 10, vk_message_id: 77, from_id: 500, outgoing: false, body: '', sent_at: '2026-08-27T17:40:00',
  updated_at: null, deleted: false, is_read: true, attachments: [{ type: 'audio_message', audio_message: { duration: 8, link_ogg: 'https://example.test/voice.ogg' } }],
  reply_message: null, forwarded_messages: [],
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function stubApi() {
  return vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = String(request); const method = init?.method || 'GET'
    if (url.endsWith('/api/accounts')) return json([account])
    if (url.includes('/api/inbox/folders')) return json([])
    if (url.includes('/api/inbox/dialogs?')) return json([dialog])
    if (url.endsWith('/api/inbox/dialogs/10?limit=50')) return json({ dialog, reply_account: { id: 1, name: 'Иван Иванов', note: '', avatar_url: '' }, messages: [voice], local_total: 1, next_before_vk_message_id: null, has_older_local: false })
    if (url.includes('/api/inbox/dialogs/10/sync') && method === 'POST') return json({ ok: true, messages: 1, fetched: 1, total: 1, next_offset: 1, has_more: false })
    if (url.includes('/api/quick-replies')) return json([{ id: 'q1', text: 'Готово' }])
    if (url.includes('/api/inbox/dialogs/10/activity')) return json({ ok: true })
    if (url.includes('/api/inbox/dialogs/10/reply')) return json({ ok: true, message_id: 99, account_id: 1 })
    return json({ ok: true })
  })
}

function renderPage(scale = 2) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><UiScaleProvider value={scale}><div id="app-overlay-root" /><InboxPage /></UiScaleProvider></QueryClientProvider>)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('InboxPage v0.4.10 scaled interactions', () => {
  it('portals the dialog context menu out of page overflow clipping', async () => {
    vi.stubGlobal('fetch', stubApi())
    renderPage(2)
    const dialogButton = await screen.findByRole('button', { name: /Пётр/ })
    fireEvent.contextMenu(dialogButton, { clientX: 900, clientY: 650 })
    const action = await screen.findByRole('button', { name: 'В архив' })
    expect(document.getElementById('app-overlay-root')?.contains(action)).toBe(true)
    expect(action.closest('.context-menu')).not.toHaveAttribute('style')
  })

  it('uses a compact auto-growing composer and keeps Shift+Enter as a newline action', async () => {
    const fetchMock = stubApi()
    vi.stubGlobal('fetch', fetchMock)
    renderPage(1.5)
    fireEvent.click(await screen.findByRole('button', { name: /Пётр/ }))
    const textarea = await screen.findByRole('textbox', { name: 'Ответ' })
    expect(textarea).toHaveClass('composer-input')
    fireEvent.change(textarea, { target: { value: 'строка один' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(fetchMock.mock.calls.some(([request]) => String(request).includes('/api/inbox/dialogs/10/reply'))).toBe(false)
  })

  it('keeps native voice playback controls in the message DOM', async () => {
    vi.stubGlobal('fetch', stubApi())
    renderPage(3)
    fireEvent.click(await screen.findByRole('button', { name: /Пётр/ }))
    await waitFor(() => expect(document.querySelector('.voice-card audio[controls].voice-player')).not.toBeNull())
  })

  it('keeps emoji and quick-reply actions reachable from the compact control stack', async () => {
    vi.stubGlobal('fetch', stubApi())
    renderPage(.75)
    fireEvent.click(await screen.findByRole('button', { name: /Пётр/ }))
    const controls = await screen.findByTestId('composer-controls')
    expect(within(controls).getByRole('button', { name: 'Смайлики' })).toBeInTheDocument()
    expect(within(controls).getByRole('button', { name: 'Быстрые ответы' })).toBeInTheDocument()
    expect(within(controls).getByRole('button', { name: /Отправить/ })).toBeInTheDocument()
  })

  it('does not close a portaled quick-reply popover before its item click is handled', async () => {
    vi.stubGlobal('fetch', stubApi())
    renderPage(2)
    fireEvent.click(await screen.findByRole('button', { name: /Пётр/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Быстрые ответы' }))
    const quickReply = await screen.findByRole('button', { name: 'Готово' })
    expect(document.getElementById('app-overlay-root')?.contains(quickReply)).toBe(true)
    fireEvent.pointerDown(quickReply)
    fireEvent.click(quickReply)
    expect(await screen.findByRole('textbox', { name: 'Ответ' })).toHaveValue('Готово')
  })

  it('keeps the forward-message modal reachable at 300% scale', async () => {
    vi.stubGlobal('fetch', stubApi())
    renderPage(3)
    fireEvent.click(await screen.findByRole('button', { name: /Пётр/ }))
    const bubble = await waitFor(() => {
      const value = document.querySelector<HTMLElement>('.bubble')
      expect(value).not.toBeNull()
      return value as HTMLElement
    })
    fireEvent.contextMenu(bubble, { clientX: 1100, clientY: 740 })
    fireEvent.click(await screen.findByRole('button', { name: 'Переслать' }))
    const title = await screen.findByText('Переслать сообщение')
    expect(title.closest('.modal-backdrop')).not.toBeNull()
    expect(screen.getByText('Других диалогов этого аккаунта нет')).toBeInTheDocument()
  })
})
