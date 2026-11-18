'use client'

import { FormEvent, ReactNode, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Heart, LoaderCircle, Sparkles } from 'lucide-react'
import { categories, euro, zone } from '@/lib/catalog'
import { DateTime } from 'luxon'

export function ActionForm({ action, children, className, reset = false }: { action: string; children: ReactNode; className?: string; reset?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/action', { method: 'POST', body: new FormData(form) })
      const result = await response.json()
      if (!response.ok) {
        setError(true)
        setMessage(result.error)
        return
      }
      if (result.next) {
        window.location.assign(result.next)
        return
      }
      setError(false)
      setMessage(result.message)
      if (reset) form.reset()
      router.refresh()
    } catch {
      setError(true)
      setMessage('Connessione non disponibile. Riprova.')
    } finally {
      setPending(false)
    }
  }
  return <form className={className} method="post" action="/api/action" onSubmit={submit} aria-busy={pending}>
    <input type="hidden" name="action" value={action} />
    <fieldset disabled={pending} className="action-fields">{children}</fieldset>
    {pending && <span className="form-loading" role="status"><LoaderCircle size={15} /> Elaborazione…</span>}
    {message && <p className={error ? 'notice notice-error' : 'notice'} role={error ? 'alert' : 'status'}>{message}</p>}
  </form>
}

export function FavoriteButton({ id, saved }: { id: string; saved: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function toggle() {
    setBusy(true)
    setError('')
    const data = new FormData()
    data.set('action', 'favorite')
    data.set('id', id)
    data.set('remove', saved ? 'yes' : 'no')
    try {
      const response = await fetch('/api/action', { method: 'POST', body: data })
      if (!response.ok) setError((await response.json()).error)
      else router.refresh()
    } catch {
      setError('Connessione non disponibile.')
    } finally {
      setBusy(false)
    }
  }
  const label = saved ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'
  return <><button type="button" className="favorite" aria-pressed={saved} aria-label={label} title={label} disabled={busy} onClick={toggle}>
    {busy ? <LoaderCircle size={20} className="spin" /> : <Heart size={20} fill={saved ? 'currentColor' : 'none'} />}
  </button>{error && <span className="favorite-error notice-error" role="alert">{error}</span>}</>
}

export type ShopFields = { name: string; kind: string; address: string; city: string; description: string }
export function ShopInputs({ shop }: { shop?: ShopFields }) {
  return <div className="fields-grid">
    <label>Nome attività<input name="shopName" defaultValue={shop?.name} maxLength={100} required /></label>
    <label>Tipologia<input name="kind" defaultValue={shop?.kind} placeholder="Es. Panificio" maxLength={80} required /></label>
    <label>Indirizzo<input name="address" defaultValue={shop?.address} maxLength={140} required /></label>
    <label>Città<input name="city" defaultValue={shop?.city} maxLength={80} required /></label>
    <label className="wide">Descrizione attività<textarea name="shopDescription" defaultValue={shop?.description} maxLength={600} required /></label>
  </div>
}

export function AccountForm({ register, seller, next }: { register: boolean; seller: boolean; next?: string }) {
  const [role, setRole] = useState(seller ? 'seller' : 'customer')
  return <ActionForm action={register ? 'register' : 'login'} className="stack">
    <div className="fields-grid">
      {next && <input type="hidden" name="next" value={next} />}
      {register && <>
        <label className="wide">Tipo di account<select name="role" value={role} onChange={event => setRole(event.target.value)}>
          <option value="customer">Cliente</option><option value="seller">Venditore</option>
        </select></label>
        <label className="wide">Nome<input name="name" autoComplete="name" maxLength={80} required /></label>
      </>}
      <label className="wide">Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="wide">Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 10 : undefined} maxLength={128} required />
        {register && <small>Usa almeno 10 caratteri.</small>}
      </label>
    </div>
    {register && role === 'seller' && <ShopInputs />}
    <button className="button primary full">{register ? 'Crea account' : 'Accedi'} <ArrowRight size={17} /></button>
  </ActionForm>
}

export function Checkout({ id, price, stock, requestId }: { id: string; price: number; stock: number; requestId: string }) {
  const request = useRef(requestId)
  const [quantity, setQuantity] = useState('1')
  const value = Number(quantity)
  const valid = Number.isInteger(value) && value >= 1 && value <= stock
  return <ActionForm action="purchase" className="stack checkout">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="requestId" value={request.current} />
    <label>Quantità<input name="quantity" type="number" min={1} max={stock} value={quantity} onChange={event => setQuantity(event.target.value)} required /></label>
    {valid && <div className="split"><strong>Totale simulato</strong><strong>{euro(price * value)}</strong></div>}
    <button className="button primary full" disabled={!valid}>Conferma ordine simulato <ArrowRight size={17} /></button>
  </ActionForm>
}

type OfferFields = {
  id: string; version: string; title: string; description: string; category: string; image: string;
  original: number; price: number; stock: number; ingredients: string; allergens: string;
  storage: string; starts: string; ends: string; donation: boolean
}

export function OfferForm({ offer, initialStart, initialEnd }: { offer?: OfferFields; initialStart: string; initialEnd: string }) {
  const [starts, setStarts] = useState(offer?.starts ?? initialStart)
  const [original, setOriginal] = useState(offer ? (offer.original / 100).toFixed(2) : '')
  const [price, setPrice] = useState(offer ? (offer.price / 100).toFixed(2) : '')
  const [suggestion, setSuggestion] = useState<{ price: number; percent: number } | null>(null)
  const [hint, setHint] = useState('')
  function suggest() {
    const cents = Math.round(Number(original.replace(',', '.')) * 100)
    const start = DateTime.fromISO(starts, { zone })
    if (!Number.isFinite(cents) || cents < 2 || !start.isValid) {
      setHint('Inserisci prezzo originale e inizio del ritiro.')
      setSuggestion(null)
      return
    }
    const minutes = start.diffNow('minutes').minutes
    const percent = minutes <= 60 ? 70 : minutes <= 180 ? 60 : 50
    setHint('')
    setSuggestion({ price: Math.max(1, Math.round(cents * (100 - percent) / 100)), percent })
  }
  return <ActionForm action="offer" className="stack">
    {offer && <><input type="hidden" name="id" value={offer.id} /><input type="hidden" name="version" value={offer.version} /></>}
    <div className="fields-grid">
      <label>Titolo<input name="title" maxLength={100} defaultValue={offer?.title} required /></label>
      <label>Categoria<select name="category" defaultValue={offer?.category ?? 'forno'}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="wide">Descrizione del contenuto<textarea name="description" maxLength={700} defaultValue={offer?.description} required /></label>
      <label className="wide">Indirizzo immagine HTTPS <small>Facoltativo. Se vuoto, usiamo la foto della categoria.</small><input name="image" type="url" maxLength={500} defaultValue={offer?.image.startsWith('https://') ? offer.image : ''} /></label>
      <label>Prezzo originale (€)<input name="original" inputMode="decimal" value={original} onChange={event => { setOriginal(event.target.value); setSuggestion(null) }} required /></label>
      <label>Prezzo scontato (€)<input name="price" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} required /></label>
      <label>Quantità disponibile<input name="stock" type="number" min={0} max={10000} defaultValue={offer?.stock ?? 1} required /></label>
      <label>Indicazioni di conservazione<input name="storage" maxLength={500} defaultValue={offer?.storage} /></label>
      <label>Ingredienti<textarea name="ingredients" maxLength={700} defaultValue={offer?.ingredients} /></label>
      <label>Allergeni dichiarati<textarea name="allergens" maxLength={700} defaultValue={offer?.allergens} /></label>
      <label>Inizio ritiro (ora italiana)<input name="starts" type="datetime-local" value={starts} onChange={event => { setStarts(event.target.value); setSuggestion(null) }} required /></label>
      <label>Fine ritiro (ora italiana)<input name="ends" type="datetime-local" defaultValue={offer?.ends ?? initialEnd} required /></label>
    </div>
    <div className="notice suggestion">
      <div><strong><Sparkles size={16} /> Suggerimento di prezzo</strong><p>La regola propone uno sconto del 50%, del 60% nelle ultime tre ore e del 70% nell’ultima ora prima del ritiro.</p></div>
      <button className="button outline small" type="button" onClick={suggest}>Calcola suggerimento</button>
      {hint && <p role="status">{hint}</p>}
      {suggestion && <div className="split wide" role="status"><strong>{euro(suggestion.price)} · sconto del {suggestion.percent}% circa</strong><button className="button outline small" type="button" onClick={() => { setPrice((suggestion.price / 100).toFixed(2)); setSuggestion(null); setHint('Prezzo inserito. Salva l’offerta per applicarlo.') }}>Usa questo prezzo</button></div>}
    </div>
    <label className="check"><input name="donation" type="checkbox" defaultChecked={offer?.donation} /> Disponibile per donazione</label>
    <p className="muted">Le eccedenze per donazione compaiono nella sezione dedicata.</p>
    <button className="button primary">{offer ? 'Salva le modifiche' : 'Pubblica offerta'} <ArrowRight size={17} /></button>
  </ActionForm>
}
