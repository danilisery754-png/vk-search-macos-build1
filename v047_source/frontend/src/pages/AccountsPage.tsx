import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleUserRound, GripVertical, KeyRound, MoreVertical, Plus, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { api } from '../api/client'
import ScaledOverlay from '../components/ScaledOverlay'
import { Button, Card, EmptyState, PageHeader, Status } from '../components/ui'
import type { Account } from '../types'
import { formatLocalDateTime } from '../utils/time'

interface AuthJob { id: string; state: string; message: string; account_id: number | null; error: string }

const VISUAL_ORDER_KEY = 'vk-search.accounts.visual-order.v1'

export function normalizeVisualAccountOrder(saved: number[], existing: number[]): number[] {
  const existingSet = new Set(existing)
  const uniqueSaved = [...new Set(saved.filter(id => existingSet.has(id)))]
  return [...uniqueSaved, ...existing.filter(id => !uniqueSaved.includes(id))]
}

export function moveVisualAccountOrder(order: number[], source: number, target: number): number[] {
  if (source === target || !order.includes(source) || !order.includes(target)) return [...order]
  const next = order.filter(id => id !== source)
  const targetIndex = next.indexOf(target)
  next.splice(targetIndex + (order.indexOf(source) < order.indexOf(target) ? 1 : 0), 0, source)
  return next
}

function loadVisualOrder(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(VISUAL_ORDER_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
  } catch {
    return []
  }
}

function quotaUnlockLabel(account: Account) {
  if (!account.quota_window_ends_at) return 'Окно начнётся с первой учтённой группы'
  return `Разблокируется ${formatLocalDateTime(account.quota_window_ends_at)}`
}

const healthLabels: Record<string, string> = {
  alive: 'Живой', blocked: 'Заблокирован', deactivated: 'Деактивирован',
  requires_login: 'Нужен вход', unknown: 'Не удалось проверить',
}

function healthTone(value: string | undefined) {
  return value === 'alive' ? 'success' : value === 'blocked' || value === 'deactivated' ? 'danger' : value === 'requires_login' ? 'warning' : 'neutral'
}

export default function AccountsPage() {
  const client = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)
  const [menuAccountId, setMenuAccountId] = useState<number | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLButtonElement | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [visualOrder, setVisualOrder] = useState<number[]>(loadVisualOrder)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api<Account[]>('/accounts'), refetchInterval: 4000 })
  const auth = useMutation({ mutationFn: (accountId?: number) => api<AuthJob>(`/accounts/authorize${accountId ? `?account_id=${accountId}` : ''}`, { method: 'POST' }), onSuccess: job => setJobId(job.id), onError: (error: Error) => toast.error(error.message) })
  const authStatus = useQuery({ queryKey: ['auth-job', jobId], queryFn: () => api<AuthJob>(`/accounts/authorize/${jobId}`), enabled: !!jobId, refetchInterval: query => ['completed', 'failed'].includes(query.state.data?.state || '') ? false : 1000 })
  const confirmAuth = useMutation({ mutationFn: () => api<AuthJob>(`/accounts/authorize/${jobId}/confirm`, { method: 'POST' }), onSuccess: job => client.setQueryData(['auth-job', jobId], job), onError: (error: Error) => toast.error(error.message) })
  useEffect(() => { const job = authStatus.data; if (job?.state === 'completed') { toast.success('VK-аккаунт подключён'); setJobId(null); client.invalidateQueries({ queryKey: ['accounts'] }) } else if (job?.state === 'failed') { toast.error(job.error || 'Авторизация не завершена'); setJobId(null) } }, [authStatus.data, client])
  const update = useMutation({ mutationFn: ({ id, values }: { id: number; values: object }) => api(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(values) }), onSuccess: () => client.invalidateQueries({ queryKey: ['accounts'] }) })
  const remove = useMutation({ mutationFn: (id: number) => api(`/accounts/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Аккаунт удалён вместе с токеном'); closeMenu(); client.invalidateQueries({ queryKey: ['accounts'] }) } })
  const openMessages = useMutation({ mutationFn: (id: number) => api(`/accounts/${id}/open-messages`, { method: 'POST' }), onSuccess: () => { closeMenu(); toast.success('Окно сообщений VK открывается') }, onError: (error: Error) => toast.error(error.message) })
  const healthCheck = useMutation({ mutationFn: () => api<Account[]>('/accounts/health/check', { method: 'POST' }), onSuccess: rows => { if (Array.isArray(rows)) client.setQueryData(['accounts'], rows) } })

  const orderedAccounts = useMemo(() => {
    const rows = accounts.data || []
    const byId = new Map(rows.map(row => [row.id, row]))
    return normalizeVisualAccountOrder(visualOrder, rows.map(row => row.id)).map(id => byId.get(id)).filter((row): row is Account => Boolean(row))
  }, [accounts.data, visualOrder])
  const menuAccount = useMemo(() => orderedAccounts.find(account => account.id === menuAccountId) || null, [menuAccountId, orderedAccounts])

  function closeMenu() {
    setMenuAccountId(null)
    setMenuAnchor(null)
  }

  useEffect(() => {
    if (!accounts.data) return
    const normalized = normalizeVisualAccountOrder(visualOrder, accounts.data.map(row => row.id))
    if (normalized.join(',') !== visualOrder.join(',')) {
      setVisualOrder(normalized)
      localStorage.setItem(VISUAL_ORDER_KEY, JSON.stringify(normalized))
    }
  }, [accounts.data, visualOrder])

  useEffect(() => {
    healthCheck.mutate()
    const timer = window.setInterval(() => healthCheck.mutate(), 300_000)
    return () => window.clearInterval(timer)
    // Run once on page entry, then no more frequently than once every five minutes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (menuAccountId === null) return
    const pointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || menuAnchor?.contains(target)) return
      closeMenu()
    }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu() }
    document.addEventListener('pointerdown', pointer)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key) }
  }, [menuAccountId, menuAnchor])

  useEffect(() => {
    if (editingNoteId === null) return
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-note-account="${editingNoteId}"]`)?.focus())
  }, [editingNoteId])

  const startDrag = (accountId: number, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(accountId))
    setDraggingId(accountId)
    setDragOverId(null)
    closeMenu()
  }

  const finishDrag = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const dropAccount = (targetId: number, event: DragEvent) => {
    event.preventDefault()
    const transferred = Number(event.dataTransfer.getData('text/plain'))
    const sourceId = draggingId ?? (Number.isFinite(transferred) ? transferred : null)
    if (sourceId == null) return finishDrag()
    const current = normalizeVisualAccountOrder(visualOrder, (accounts.data || []).map(row => row.id))
    const next = moveVisualAccountOrder(current, sourceId, targetId)
    setVisualOrder(next)
    localStorage.setItem(VISUAL_ORDER_KEY, JSON.stringify(next))
    finishDrag()
  }

  const toggleMenu = (accountId: number, button: HTMLButtonElement) => {
    if (menuAccountId === accountId) return closeMenu()
    setMenuAccountId(accountId)
    setMenuAnchor(button)
  }

  return <div className="page page--accounts">
    <PageHeader title="Аккаунты" description="Независимые VK-профили с отдельными токенами, сессиями и суточными лимитами" actions={<Button onClick={() => auth.mutate(undefined)} loading={auth.isPending || !!jobId}><Plus size={17} />Подключить аккаунт</Button>} />
    {jobId && <div className="auth-banner"><div className="auth-pulse"><KeyRound /></div><div><strong>{authStatus.data?.message || 'Открываю окно авторизации…'}</strong><span>{authStatus.data?.state === 'waiting_user' ? 'Войдите в VK в открывшемся окне. После успешного входа нажмите кнопку справа.' : 'Не закрывайте окно VK. Получение и проверка токена выполняются автоматически.'}</span></div>{authStatus.data?.state === 'waiting_user' ? <Button onClick={() => confirmAuth.mutate()} loading={confirmAuth.isPending}>Я вошёл в VK</Button> : <Status state="waiting">Выполняется</Status>}</div>}
    <div className="account-info"><ShieldCheck size={20} /><div><strong>Безопасное хранение</strong><span>Токены защищены системным хранилищем секретов вашей ОС и доступны только вашему пользователю.</span></div></div>
    {!orderedAccounts.length ? <Card><EmptyState icon={<Users />} title="Аккаунты ещё не подключены" text="Нажмите «Подключить аккаунт». Приложение откроет отдельное окно VK и самостоятельно заберёт токен после входа." action={<Button onClick={() => auth.mutate(undefined)}><CircleUserRound size={17} />Подключить первый аккаунт</Button>} /></Card> : <div className="accounts-scroll" data-testid="accounts-scroll"><div className="accounts-grid">{orderedAccounts.map(account => {
      const dailyLimit = account.daily_limit ?? 0
      const consumed = account.quota_consumed ?? 0
      const available = account.quota_available ?? Math.max(0, dailyLimit - consumed)
      return <Card
        className={`account-card ${draggingId === account.id ? 'account-card--dragging' : ''} ${dragOverId === account.id && draggingId !== account.id ? 'account-card--drag-over' : ''}`}
        data-testid="account-card"
        data-account-id={account.id}
        key={account.id}
        onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (draggingId !== null && draggingId !== account.id) setDragOverId(account.id) }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverId(current => current === account.id ? null : current) }}
        onDrop={event => dropAccount(account.id, event)}
      >
      <div className="account-head">
        <button type="button" className="account-drag-handle" data-testid="account-drag-handle" draggable aria-label={`Перетащить аккаунт ${account.display_name}`} title="Перетащить аккаунт" onDragStart={event => startDrag(account.id, event)} onDragEnd={finishDrag}><GripVertical size={17} /></button>
        {account.avatar_url ? <img src={account.avatar_url} alt={account.display_name} /> : <div className="avatar-fallback">{account.display_name.slice(0, 1)}</div>}<div><h3>{account.display_name}</h3><a href={account.profile_url} target="_blank">VK ID {account.vk_user_id}</a></div><div className="account-menu-wrap"><button className="icon-button account-menu-trigger" aria-label={`Меню аккаунта ${account.display_name}`} aria-haspopup="menu" aria-expanded={menuAccountId === account.id} onClick={event => toggleMenu(account.id, event.currentTarget)}><MoreVertical size={18} /></button></div></div>
      <div className="account-health-row"><Status state={healthTone(account.health_status)}>{healthLabels[account.health_status || 'unknown'] || 'Не удалось проверить'}</Status>{account.health_detail && <small title={account.health_detail}>{account.health_detail}</small>}</div>
      <div className="account-state-compact"><span>{account.enabled ? 'Аккаунт включён' : 'Аккаунт выключен'}</span><label className="switch" aria-label={`Аккаунт ${account.display_name} включён`}><input type="checkbox" checked={account.enabled} onChange={e => update.mutate({ id: account.id, values: { enabled: e.target.checked } })} /><span /></label></div>
      {dailyLimit > 0 && <div className="account-quota"><div><span>Суточный лимит</span><strong>{consumed} / {dailyLimit}</strong></div><small>Доступно сейчас: {available}</small><small>{quotaUnlockLabel(account)}</small></div>}
      <label className="field account-note-row"><span>Заметка аккаунта</span><input data-note-account={account.id} defaultValue={account.note} placeholder={`${account.first_name} ${account.last_name}`} onFocus={() => setEditingNoteId(account.id)} onBlur={e => { update.mutate({ id: account.id, values: { note: e.target.value } }); setEditingNoteId(null) }} /></label>
      {account.last_error && <div className="account-error">{account.last_error}</div>}
    </Card>})}</div></div>}

    {menuAccount && menuAnchor && <ScaledOverlay anchor={menuAnchor} placement="left-end"><div className="account-menu" role="menu" ref={menuRef}>
      <button role="menuitem" onClick={() => { update.mutate({ id: menuAccount.id, values: { enabled: !menuAccount.enabled } }); closeMenu() }}>{menuAccount.enabled ? 'Выключить аккаунт' : 'Включить аккаунт'}</button>
      <button role="menuitem" onClick={() => { setEditingNoteId(menuAccount.id); closeMenu() }}>Изменить заметку</button>
      <button role="menuitem" onClick={() => openMessages.mutate(menuAccount.id)}>Открыть сообщения</button>
      <button role="menuitem" onClick={() => { const id = menuAccount.id; closeMenu(); auth.mutate(id) }}>Обновить вход</button>
      <button role="menuitem" className="danger-text" onClick={() => { if (confirm('Удалить аккаунт, токен и сохранённую сессию?')) remove.mutate(menuAccount.id) }}>Удалить аккаунт</button>
    </div></ScaledOverlay>}
  </div>
}
