import { createDemo, DEMO_CODE } from './demo-data'
import type { DemoState, Order, Profile } from './demo-types'
import { InputError, number, offerInput, read, shopInput } from './input'

export function restoreDemo(value: string | null) {
  if (!value) return null
  try {
    const data = JSON.parse(value, (key, item) =>
      ['starts', 'ends', 'created', 'updated'].includes(key) && typeof item === 'string' ? new Date(item) : item,
    ) as DemoState
    if (data?.version === 1 && [data.profiles, data.shops, data.offers, data.orders, data.favorites].every(Array.isArray)) {
      return data
    }
  } catch { /* A missing or invalid snapshot can be replaced with the initial demo. */ }
  return null
}

export function currentProfile(state: DemoState) {
  return state.profiles.find(profile => profile.id === state.userId)
}

export function withOrderStatus(order: Order, now = new Date()): Order {
  return order.status === 'confirmed' && order.ends <= now ? { ...order, status: 'missed' } : order
}

const done = (message: string, next?: string) => ({ message, next })

function signedIn(state: DemoState, user: Profile, data: FormData) {
  state.userId = user.id
  const next = data.get('next')
  const destination = typeof next === 'string' && /^\/offerte\/[a-z0-9-]+$/i.test(next) ? next : '/offerte'
  return done('Accesso effettuato.', user.role === 'seller' ? '/venditore' : destination)
}

function account(state: DemoState, action: string, data: FormData) {
  if (action === 'demo-login') {
    const id = data.get('role') === 'seller' ? 'demo-seller-forno' : 'demo-customer'
    return signedIn(state, state.profiles.find(profile => profile.id === id)!, data)
  }
  const email = read(data, 'email', 'Email di prova', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Inserisci un indirizzo email di prova valido.')
  const existing = state.profiles.find(profile => profile.email === email)
  if (action === 'login') {
    if (!existing || data.get('code') !== DEMO_CODE) throw new InputError('Email di prova o codice demo non corretti.')
    return signedIn(state, existing, data)
  }
  if (existing) throw new InputError('Esiste già un profilo con questa email di prova.')
  const role = data.get('role')
  if (role !== 'customer' && role !== 'seller') throw new InputError('Seleziona un ruolo valido.')
  const user: Profile = { id: crypto.randomUUID(), email, role, name: read(data, 'name', 'Nome', 80) }
  if (role === 'seller') {
    state.shops.push({ ...shopInput(data), id: crypto.randomUUID(), ownerId: user.id, demo: true })
  }
  state.profiles.push(user)
  return signedIn(state, user, data)
}

function purchase(state: DemoState, userId: string, data: FormData, now: Date) {
  const offerId = read(data, 'id', 'Offerta', 80)
  const id = read(data, 'requestId', 'Prenotazione', 36)
  const quantity = number(data, 'quantity', 1, 10000)
  const previous = state.orders.find(order => order.id === id)
  if (previous) {
    if (previous.userId === userId && previous.offerId === offerId && previous.quantity === quantity) {
      return done('Prenotazione confermata.', `/ordini/${id}`)
    }
    throw new InputError('Ricarica l’offerta per inviare una nuova prenotazione.')
  }
  const offer = state.offers.find(item => item.id === offerId)
  const shop = state.shops.find(item => item.id === offer?.shopId)
  if (!offer?.active || !shop || offer.donation || offer.ends <= now || offer.stock < quantity) {
    throw new InputError('L’offerta è terminata o la quantità non è più disponibile.')
  }
  const total = offer.price * quantity
  const fee = Math.round(total / 5)
  let code: string
  do {
    code = Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  } while (state.orders.some(order => order.code === code))
  state.orders.unshift({
    id, userId, offerId, shopId: shop.id, quantity, unit: offer.price, original: offer.original, total,
    fee, payout: total - fee, status: 'confirmed', code, starts: offer.starts, ends: offer.ends, created: now,
    snapshot: {
      title: offer.title, description: offer.description, shop: shop.name, address: shop.address, city: shop.city,
      ingredients: offer.ingredients, allergens: offer.allergens, storage: offer.storage, demo: true,
    },
  })
  offer.stock -= quantity
  offer.updated = now
  return done('Prenotazione confermata.', `/ordini/${id}`)
}

function customerAction(state: DemoState, userId: string, action: string, data: FormData, now: Date) {
  if (action === 'purchase') return purchase(state, userId, data, now)
  if (action === 'favorite') {
    const offerId = read(data, 'id', 'Offerta', 80)
    const index = state.favorites.findIndex(item => item.offerId === offerId && item.userId === userId)
    if (data.get('remove') === 'yes') {
      if (index >= 0) state.favorites.splice(index, 1)
      return done('Offerta rimossa dai preferiti.')
    }
    if (!state.offers.some(offer => offer.id === offerId && offer.active && !offer.donation)) {
      throw new InputError('Offerta non disponibile.')
    }
    if (index === -1) state.favorites.push({ userId, offerId })
    return done('Offerta salvata nei preferiti.')
  }
  if (action === 'cancel') {
    const id = read(data, 'id', 'Ordine', 80)
    const order = state.orders.find(item => item.id === id && item.userId === userId)
    if (!order || order.status !== 'confirmed' || order.starts <= now) {
      throw new InputError('Puoi annullare un tuo ordine confermato prima dell’inizio del ritiro.')
    }
    const offer = state.offers.find(item => item.id === order.offerId)!
    order.status = 'canceled'
    offer.stock += order.quantity
    offer.updated = now
    return done('Ordine annullato. La disponibilità è stata ripristinata.')
  }
  throw new InputError('Questa funzione è riservata ai venditori.')
}

function sellerAction(state: DemoState, userId: string, action: string, data: FormData, now: Date) {
  const shop = state.shops.find(item => item.ownerId === userId)
  if (!shop) throw new InputError('Attività non trovata.')
  if (action === 'shop') {
    Object.assign(shop, shopInput(data))
    return done('Dati dell’attività aggiornati.', '/venditore')
  }
  if (action === 'collect') {
    const code = read(data, 'code', 'Codice', 24).toUpperCase()
    if (!/^[A-F0-9]{16}$/.test(code)) throw new InputError('Inserisci il codice di 16 caratteri mostrato dal cliente.')
    const order = state.orders.find(item => item.shopId === shop.id && item.code === code)
    if (!order) throw new InputError('Codice di ritiro non trovato per questa attività.')
    if (withOrderStatus(order, now).status !== 'confirmed') throw new InputError('Il codice non è più utilizzabile.')
    if (order.starts > now) throw new InputError('La conferma è possibile solo durante la fascia di ritiro.')
    order.status = 'collected'
    return done('Ritiro confermato.')
  }
  if (action !== 'offer' && action !== 'toggle') throw new InputError('Questa funzione è riservata ai clienti.')
  const id = read(data, 'id', 'Offerta', 80, action === 'toggle')
  const offer = state.offers.find(item => item.id === id && item.shopId === shop.id)
  if (id && !offer) throw new InputError('Offerta non accessibile.')
  if (action === 'toggle' && offer) {
    offer.active = data.get('active') === 'yes'
    offer.updated = now
    return done('Visibilità aggiornata.')
  }
  const values = offerInput(data, now)
  if (offer) {
    if (data.get('version') !== offer.updated.toISOString()) throw new InputError('L’offerta è cambiata. Riapri la modifica e riprova.')
    Object.assign(offer, values, { updated: now })
  } else {
    state.offers.push({ ...values, id: crypto.randomUUID(), shopId: shop.id, active: true, updated: now })
  }
  return done('Offerta salvata.', '/venditore')
}

export function runDemo(state: DemoState, action: string, data: FormData, now = new Date()) {
  if (action === 'reset') return { state: createDemo(now), ...done('Demo ripristinata.', '/') }
  const next = structuredClone(state)
  const user = currentProfile(next)
  let result: ReturnType<typeof done>
  if (['register', 'login', 'demo-login'].includes(action)) {
    result = account(next, action, data)
  } else if (action === 'logout') {
    next.userId = null
    result = done('Hai effettuato l’uscita.', '/')
  } else if (!user) {
    throw new InputError('Accedi a un profilo di prova per continuare.')
  } else {
    result = user.role === 'customer' ? customerAction(next, user.id, action, data, now) : sellerAction(next, user.id, action, data, now)
  }
  return { state: next, ...result }
}
