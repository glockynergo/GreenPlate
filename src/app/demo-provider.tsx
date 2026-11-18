'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createDemo } from '@/lib/demo-data'
import { restoreDemo, runDemo } from '@/lib/demo'
import type { DemoState } from '@/lib/demo-types'
import { InputError } from '@/lib/input'

const storageKey = 'greenplate-demo-v1'
type Demo = {
  state: DemoState | null
  persistent: boolean
  now: Date | null
  apply: (action: string, fields: FormData) => Promise<{ message: string; next?: string }>
}
const DemoContext = createContext<Demo | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const latest = useRef<DemoState | null>(null)
  const storage = useRef<Storage | null>(null)
  const [state, setState] = useState<DemoState | null>(null)
  const [persistent, setPersistent] = useState(true)
  const [now, setNow] = useState<Date | null>(null)

  function update(current: DemoState) {
    latest.current = current
    setState(current)
  }

  useEffect(() => {
    let initial = latest.current ?? createDemo()
    try {
      const session = window.localStorage
      const previous = restoreDemo(session.getItem(storageKey))
      if (previous) initial = previous
      else session.setItem(storageKey, JSON.stringify(initial))
      storage.current = session
    } catch {
      setPersistent(false)
    }
    update(initial)
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    function synchronize(event: StorageEvent) {
      if (storage.current && event.storageArea === storage.current && (event.key === storageKey || event.key === null)) {
        update(restoreDemo(event.newValue) ?? createDemo())
      }
    }
    window.addEventListener('storage', synchronize)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', synchronize)
    }
  }, [])

  async function apply(action: string, fields: FormData) {
    function change() {
      let current = latest.current
      if (!current) throw new InputError('Attendi il caricamento della demo.')
      try {
        const previous = restoreDemo(storage.current?.getItem(storageKey) ?? null)
        if (previous) current = previous
      } catch {
        storage.current = null
        setPersistent(false)
      }
      const result = runDemo(current, action, fields)
      try {
        storage.current?.setItem(storageKey, JSON.stringify(result.state))
      } catch {
        storage.current = null
        setPersistent(false)
      }
      update(result.state)
      return { message: result.message, next: result.next }
    }
    if (storage.current && navigator.locks) return navigator.locks.request(storageKey, change)
    return change()
  }

  return <DemoContext.Provider value={{ state, persistent, now, apply }}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (!context) throw new Error('DemoProvider non disponibile.')
  return context
}
