import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./v0410.css', import.meta.url), 'utf8')

describe('v0.4.10 scaled layout CSS', () => {
  it('pins one full-app viewport and scale layer without scale-specific branches', () => {
    expect(css).toMatch(/\.app-viewport\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*overflow:\s*hidden/s)
    expect(css).toMatch(/\.app-scale-layer\s*\{[^}]*position:\s*relative[^}]*transform-origin:\s*top left/s)
    expect(css).toMatch(/\.app-scale-layer\s*>\s*\.app-shell\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/s)
    expect(css).not.toMatch(/data-scale|scale-75|scale-100|scale-125|scale-150|scale-200|scale-250|scale-300/)
  })

  it('keeps overlays above scroll containers and resets clipped page positioning inside the portal', () => {
    expect(css).toMatch(/\.app-overlay-root\s*\{[^}]*pointer-events:\s*none[^}]*z-index:\s*1000/s)
    expect(css).toMatch(/\.app-overlay-root\s+\.context-menu\s*\{[^}]*position:\s*static\s*!important/s)
    expect(css).toMatch(/\.app-overlay-root\s+\.account-menu\s*\{[^}]*position:\s*static\s*!important/s)
    expect(css).toMatch(/\.app-overlay-root\s+\.run-selector-panel\s*\{[^}]*position:\s*static\s*!important[^}]*inset:\s*auto\s*!important/s)
  })

  it('hardens settings, inbox and native voice controls against clipping', () => {
    expect(css).toMatch(/\.page--settings\s*\{[^}]*min-width:\s*0[^}]*container-type:\s*inline-size/s)
    expect(css).not.toMatch(/:has\(/)
    expect(css).toMatch(/\.settings-grid\s*\{[^}]*grid-template-columns:\s*repeat\([^)]*minmax\(0,/s)
    expect(css).toMatch(/\.page--inbox\s+\.inbox-layout[^}]*min-width:\s*0/s)
    expect(css).toMatch(/\.page--inbox\s+\.inbox-layout\s*\{[^}]*height:\s*calc\(var\(--logical-viewport-height\)\s*-\s*155px\)/s)
    expect(css).toMatch(/\.voice-card\s+audio\.voice-player\s*\{[^}]*display:\s*block[^}]*max-width:\s*100%/s)
  })

  it('sizes fixed modal and history drawer surfaces from logical viewport variables', () => {
    expect(css).toMatch(/\.page--inbox\s+\.modal-backdrop,\s*\n\.page--results\s+\.drawer-backdrop\s*\{[^}]*width:\s*var\(--logical-viewport-width\)[^}]*height:\s*var\(--logical-viewport-height\)/s)
    expect(css).toMatch(/\.page--inbox\s+\.forward-picker\s*\{[^}]*width:\s*min\(440px,\s*calc\(var\(--logical-viewport-width\)\s*-\s*24px\)\)/s)
    expect(css).toMatch(/\.page--inbox\s+\.forward-picker\s*\{[^}]*max-height:\s*min\(70%,\s*calc\(var\(--logical-viewport-height\)\s*-\s*24px\)\)/s)
    expect(css).toMatch(/\.page--results\s+\.history-drawer\s*\{[^}]*width:\s*min\(560px,\s*calc\(var\(--logical-viewport-width\)\s*-\s*24px\)\)[^}]*max-height:\s*var\(--logical-viewport-height\)/s)
  })

  it('bounds legacy selector, settings list and message photos without unsupported css multiplication', () => {
    expect(css).toMatch(/\.run-selector-panel\s*\{[^}]*width:\s*min\(430px,\s*calc\(var\(--logical-viewport-width\)\s*-\s*24px\)\)[^}]*max-height:\s*min\(480px,\s*calc\(var\(--logical-viewport-height\)\s*-\s*24px\)\)/s)
    expect(css).toMatch(/\.message-variant-list--scroll\s*\{[^}]*max-height:\s*min\(680px,\s*calc\(var\(--logical-viewport-height\)\s*-\s*160px\)\)/s)
    expect(css).toMatch(/\.message-photo\s*\{[^}]*max-width:\s*min\(360px,\s*100%\)/s)
    expect(css).toMatch(/\.window-bar\s+\.global-search\s*\{[^}]*width:\s*290px/s)
    expect(css).not.toMatch(/calc\([^\n;]*\*/)
  })

  it('starts the message composer at one line instead of the old fixed 70px', () => {
    expect(css).toMatch(/\.composer\s+textarea\.composer-input\s*\{[^}]*min-height:\s*32px[^}]*max-height:/s)
    expect(css).not.toMatch(/\.composer\s+textarea\.composer-input\s*\{[^}]*min-height:\s*70px/s)
  })

  it('styles an explicit account drag handle and a visible drop target', () => {
    expect(css).toMatch(/\.account-drag-handle\s*\{/)
    expect(css).toMatch(/\.account-card--drag-over\s*\{/)
  })
})
