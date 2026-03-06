import React, { useEffect, useRef, useState, useMemo } from 'react'
import { FONT_UI, FONT_MONO, TYPE, RADIUS } from '../designTokens'
import { EMOJI_CATEGORIES } from './emojiData'
import { FA_SOLID, FA_REGULAR, FA_BRANDS, type FAIcon } from './faIconData'

type Tab = 'emojis' | 'icons'
type FAStyle = 'solid' | 'regular' | 'brands'

interface EmojiPickerContentProps {
  onSelect: (icon: string | undefined) => void
  autoFocus?: boolean
}

export function EmojiPickerContent({ onSelect, autoFocus = true }: EmojiPickerContentProps) {
  const [tab, setTab] = useState<Tab>('emojis')
  const [search, setSearch] = useState('')
  const [faStyle, setFaStyle] = useState<FAStyle>('solid')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) setTimeout(() => searchRef.current?.focus(), 50)
  }, [autoFocus])

  const query = search.toLowerCase().trim()

  const filteredEmojiCategories = useMemo(() => {
    if (!query) return EMOJI_CATEGORIES
    return EMOJI_CATEGORIES
      .map(cat => ({
        label: cat.label,
        emojis: cat.emojis.filter(() => true),
      }))
      .filter(cat => cat.emojis.length > 0)
  }, [query])

  const faIcons: FAIcon[] = useMemo(() => {
    const source = faStyle === 'solid' ? FA_SOLID : faStyle === 'regular' ? FA_REGULAR : FA_BRANDS
    if (!query) return source
    return source.filter(i =>
      i.name.includes(query) ||
      i.label.toLowerCase().includes(query) ||
      i.terms.some(t => t.includes(query))
    )
  }, [faStyle, query])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--selection-bg)' : 'none',
    border: 'none',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: TYPE.body,
    fontFamily: FONT_UI,
    padding: '5px 12px',
    borderRadius: RADIUS.md,
    fontWeight: active ? 600 : 400,
  })

  const faSubTabStyle = (active: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    color: active ? 'var(--text-primary)' : 'var(--text-faintest)',
    cursor: 'pointer',
    fontSize: TYPE.sm,
    fontFamily: FONT_UI,
    padding: '3px 8px',
    borderRadius: RADIUS.sm,
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
  })

  return (
    <>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <button style={tabStyle(tab === 'emojis')} onClick={() => setTab('emojis')}>Emojis</button>
        <button style={tabStyle(tab === 'icons')} onClick={() => setTab('icons')}>Icons</button>
        <div style={{ flex: 1 }} />
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faintest)',
            cursor: 'pointer',
            fontSize: TYPE.body,
            fontFamily: FONT_UI,
            padding: '3px 6px',
            borderRadius: RADIUS.sm,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
          onClick={() => onSelect(undefined)}
          title="Reset to default"
        >Reset</button>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px' }}>
        <input
          ref={searchRef}
          type="text"
          placeholder={tab === 'emojis' ? 'Browse emojis...' : 'Search icons...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: RADIUS.md,
            color: 'var(--text-primary)',
            fontSize: TYPE.body,
            fontFamily: FONT_MONO,
            padding: '5px 8px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* FA sub-tabs */}
      {tab === 'icons' && (
        <div style={{ display: 'flex', gap: 2, padding: '0 8px 4px' }}>
          <button style={faSubTabStyle(faStyle === 'solid')} onClick={() => setFaStyle('solid')}>Solid</button>
          <button style={faSubTabStyle(faStyle === 'regular')} onClick={() => setFaStyle('regular')}>Regular</button>
          <button style={faSubTabStyle(faStyle === 'brands')} onClick={() => setFaStyle('brands')}>Brands</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {tab === 'emojis' && filteredEmojiCategories.map(cat => (
          <div key={cat.label}>
            <div style={{ color: 'var(--text-faintest)', fontSize: TYPE.sm, padding: '6px 2px 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {cat.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1 }}>
              {cat.emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 18,
                    cursor: 'pointer',
                    padding: 3,
                    borderRadius: RADIUS.md,
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => onSelect(emoji)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}

        {tab === 'icons' && (
          <>
            {faIcons.length === 0 && (
              <div style={{ color: 'var(--text-faintest)', padding: '16px 4px', textAlign: 'center' }}>
                No icons match "{search}"
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1 }}>
              {faIcons.map(icon => {
                const cls = faStyle === 'solid' ? 'fa-solid' : faStyle === 'regular' ? 'fa-regular' : 'fa-brands'
                const value = `fa:${cls} fa-${icon.name}`
                return (
                  <button
                    key={icon.name}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: 5,
                      borderRadius: RADIUS.md,
                      lineHeight: 1,
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onClick={() => onSelect(value)}
                    title={icon.label}
                  >
                    <i className={`${cls} fa-${icon.name}`} />
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
