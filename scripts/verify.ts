import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDemo, DEMO_CODE } from '../src/lib/demo-data'
import { restoreDemo, runDemo, withOrderStatus } from '../src/lib/demo'
import { local } from '../src/lib/catalog'

const now = new Date('2026-11-18T12:00:00Z')
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000)

function scenario() {
  let state = createDemo(now)
  return {
    get state() { return state },
    act(action: string, fields: Record<string, string> = {}, date = now) {
      const form = new FormData()
      for (const [key, value] of Object.entries(fields)) form.set(key, value)
      const result = runDemo(state, action, form, date)
      state = result.state
      return result
    },
  }
}

test('catalogo iniziale, profili di prova, registrazione e accesso locale', () => {
  const demo = scenario()
  assert.equal(demo.state.offers.length, 14)
  assert.equal(demo.state.offers.filter(offer => !offer.donation && offer.stock > 0).length, 12)
  assert.equal(demo.act('demo-login', { role: 'seller' }).next, '/venditore')
  demo.act('logout')
  assert.throws(() => demo.act('purchase'), /Accedi/)
  demo.act('register', { name: 'Luca Demo', email: 'luca@example.test', role: 'customer' })
  demo.act('logout')
  assert.throws(() => demo.act('register', { name: 'Luca', email: 'LUCA@example.test', role: 'customer' }), /già/)
  assert.throws(() => demo.act('login', { email: 'luca@example.test', code: 'ERRATO' }), /codice demo/)
  demo.act('login', { email: 'luca@example.test', code: DEMO_CODE })
  assert.ok(demo.state.userId)
  assert.doesNotMatch(JSON.stringify(demo.state), /GreenPlate2026/)
})

test('preferiti, ordine idempotente, disponibilità e annullamento', () => {
  const demo = scenario()
  const id = 'demo-offer-1'
  const requestId = crypto.randomUUID()
  demo.act('demo-login', { role: 'customer' })
  demo.act('favorite', { id })
  assert.equal(demo.state.favorites[0].offerId, id)
  demo.act('favorite', { id, remove: 'yes' })
  assert.equal(demo.state.favorites.length, 0)
  const fields = { id, requestId, quantity: '2' }
  assert.equal(demo.act('purchase', fields).next, '/ordini/' + requestId)
  demo.act('purchase', fields)
  assert.equal(demo.state.orders.length, 1)
  assert.deepEqual([demo.state.orders[0].total, demo.state.orders[0].fee, demo.state.orders[0].payout], [798, 160, 638])
  assert.equal(demo.state.offers[0].stock, 3)
  assert.throws(() => demo.act('purchase', { ...fields, requestId: crypto.randomUUID(), quantity: '4' }), /quantità/)
  demo.act('cancel', { id: requestId })
  assert.equal(demo.state.offers[0].stock, 5)
  assert.throws(() => demo.act('cancel', { id: requestId }), /annullare/)
  assert.equal(demo.state.orders[0].status, 'canceled')
  const saved = restoreDemo(JSON.stringify(demo.state))
  assert.equal(saved?.orders[0].created.toISOString(), now.toISOString())
  assert.equal(saved?.offers[0].stock, 5)
  assert.equal(restoreDemo('non valido'), null)
})

const offerFields = {
  title: 'Box di prova', description: 'Pane e biscotti', category: 'forno', original: '10.00', price: '4.00',
  stock: '2', ingredients: 'Frumento', allergens: 'Glutine', starts: local(at(10)), ends: local(at(90)),
}

test('offerte modificabili dal proprio venditore e ritiro monouso', () => {
  const demo = scenario()
  demo.act('demo-login', { role: 'seller' })
  assert.throws(() => demo.act('offer', { ...offerFields, price: '11' }), /prezzo/)
  demo.act('offer', offerFields)
  const offer = demo.state.offers.find(item => item.title === 'Box di prova')!
  demo.act('demo-login', { role: 'customer' })
  assert.throws(() => demo.act('toggle', { id: offer.id, active: 'no' }), /venditori/)
  demo.act('purchase', { id: offer.id, requestId: crypto.randomUUID(), quantity: '1' })
  const order = demo.state.orders[0]
  demo.act('login', { email: 'orto@greenplate.test', code: DEMO_CODE })
  assert.throws(() => demo.act('toggle', { id: offer.id }), /Offerta non accessibile/)
  assert.throws(() => demo.act('collect', { code: order.code }, at(15)), /non trovato/)
  demo.act('demo-login', { role: 'seller' })
  assert.throws(() => demo.act('collect', { code: order.code }), /fascia di ritiro/)
  demo.act('offer', { ...offerFields, id: offer.id, version: now.toISOString(), stock: '1', title: 'Nuovo titolo', price: '3' }, at(2))
  assert.equal(demo.state.orders[0].unit, 400)
  assert.equal(demo.state.orders[0].snapshot.title, 'Box di prova')
  demo.act('collect', { code: order.code.toLowerCase() }, at(15))
  assert.equal(demo.state.orders[0].status, 'collected')
  assert.throws(() => demo.act('collect', { code: order.code }, at(16)), /non è più utilizzabile/)
  demo.act('toggle', { id: offer.id, active: 'no' }, at(17))
  assert.equal(demo.state.offers.find(item => item.id === offer.id)?.active, false)
})

test('donazione, scadenza ordine e ripristino', () => {
  const demo = scenario()
  demo.act('demo-login', { role: 'seller' })
  demo.act('offer', { ...offerFields, donation: 'on' })
  const offer = demo.state.offers.find(item => item.title === 'Box di prova')!
  assert.equal(offer.donation, true)
  demo.act('demo-login', { role: 'customer' })
  assert.throws(() => demo.act('purchase', { id: offer.id, requestId: crypto.randomUUID(), quantity: '1' }), /terminata/)
  demo.act('purchase', { id: 'demo-offer-14', requestId: crypto.randomUUID(), quantity: '1' })
  assert.equal(withOrderStatus(demo.state.orders[0], at(181)).status, 'missed')
  demo.act('reset', {}, at(200))
  assert.equal(demo.state.userId, null)
  assert.equal(demo.state.orders.length, 0)
  assert.ok(demo.state.offers[13].ends > at(200))
})
