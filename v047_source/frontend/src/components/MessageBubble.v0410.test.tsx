import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MessageItem } from '../types'
import MessageBubble from './MessageBubble'


describe('MessageBubble v0.4.10 voice layout', () => {
  it('marks a voice-message bubble explicitly without relying on CSS :has()', () => {
    const message: MessageItem = {
      id: 77,
      vk_message_id: 77,
      from_id: 500,
      outgoing: false,
      body: '',
      sent_at: '2026-08-28T12:00:00',
      updated_at: null,
      deleted: false,
      is_read: true,
      attachments: [{
        type: 'audio_message',
        audio_message: { duration: 8, link_ogg: 'https://example.test/voice.ogg' },
      }],
      reply_message: null,
      forwarded_messages: [],
    }

    render(<MessageBubble message={message} onContextMenu={vi.fn()} />)

    const player = document.querySelector('audio.voice-player')
    expect(player).not.toBeNull()
    expect(player?.closest('.bubble')).toHaveClass('bubble--voice')
    expect(screen.getByText(/Голосовое/)).toBeInTheDocument()
  })
})
