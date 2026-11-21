'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Monitor, Moon, Sun, SunMoon } from 'lucide-react'
import { themeStorageKey, readTheme, applyTheme } from '@/lib/theme'

const themes = [
  { id: 'light', label: 'Chiaro', icon: Sun },
  { id: 'dark', label: 'Scuro', icon: Moon },
  { id: 'system', label: 'Dispositivo', icon: Monitor },
] as const

export function ThemePicker() {
  const [theme, setTheme] = useState(readTheme(null))
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const group = useId()

  useEffect(() => {
    setTheme(readTheme(document.documentElement.getAttribute('data-theme')))
    function sync(event: StorageEvent) {
      if (event.key !== themeStorageKey && event.key !== null) return
      const next = readTheme(event.newValue)
      applyTheme(next)
      setTheme(next)
    }
    function closeOutside(event: PointerEvent) {
      const details = menu.current
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false
    }
    window.addEventListener('storage', sync)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('storage', sync)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [])

  function choose(next: (typeof themes)[number]['id']) {
    setTheme(next)
    applyTheme(next)
    try { localStorage.setItem(themeStorageKey, next) } catch { /* Theme still applies on the current page. */ }
  }

  return <details className="theme-picker" ref={menu} onKeyDown={event => {
    if (event.key !== 'Escape' || !event.currentTarget.open) return
    event.preventDefault()
    event.currentTarget.open = false
    trigger.current?.focus()
  }}>
    <summary ref={trigger}><SunMoon size={16} aria-hidden="true" /> Aspetto <ChevronDown className="theme-chevron" size={13} aria-hidden="true" /></summary>
    <fieldset className="theme-panel">
      <legend className="sr-only">Tema del sito</legend>
      <p className="theme-title" aria-hidden="true">Tema del sito</p>
      <div className="theme-options">
        {themes.map(({ id, label, icon: Icon }) => <label key={id} className="theme-option">
          <input className="sr-only" type="radio" name={group} checked={theme === id} onChange={() => choose(id)} />
          <span className={'theme-swatch theme-swatch-' + id} aria-hidden="true"><span /><span /></span>
          <span className="theme-label"><Icon size={14} aria-hidden="true" /> {label}</span>
        </label>)}
      </div>
    </fieldset>
  </details>
}
