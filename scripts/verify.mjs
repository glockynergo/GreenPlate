import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import { spawn, spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { DateTime } from 'luxon'

const temp = await mkdtemp(join(tmpdir(), 'greenplate-'))
const url = `file:${join(temp, 'test.db')}`
const host = `http://127.0.0.1:${process.env.GREENPLATE_TEST_PORT ?? 4191}`
const env = { ...process.env, DATABASE_URL: url, DEMO_MODE: 'true', COOKIE_SECURE: 'false', NEXT_TELEMETRY_DISABLED: '1' }
const db = new PrismaClient({ datasourceUrl: url })
const test = (message) => console.log('✓ ' + message)
let server
let stopped
let serverOutput = ''
const duplicateId = randomUUID()
const password = 'GreenPlate2026!'
const credentials = { email: 'cliente@greenplate.test', password }
const when = (minutes) => DateTime.now().setZone('Europe/Rome').plus({ minutes }).toFormat("yyyy-MM-dd'T'HH:mm")
const values = {
  title: 'Test box di primavera', description: 'Insalata di farro e carote', category: 'misti', original: '12.50',
  price: '4.33', stock: '2', starts: when(60), ends: when(120), ingredients: 'Farro e carote', allergens: 'Farro (glutine)',
  storage: 'Tenere al fresco.',
}

function run(path, args) {
  const result = spawnSync(process.execPath, [path, ...args], { env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stdout + result.stderr)
}

function client() {
  let cookie
  return {
    async action(action, fields = {}, status = 200, origin = host) {
      const response = await fetch(host + '/api/action', {
        method: 'POST', headers: { origin, ...(cookie ? { cookie } : {}) },
        body: new URLSearchParams({ ...(action === 'purchase' ? { requestId: randomUUID() } : {}), ...fields, action }),
      })
      const result = await response.json()
      assert.equal(response.status, status, action + ' ' + JSON.stringify(result))
      const session = response.headers.get('set-cookie')
      if (session) {
        assert.match(session, /HttpOnly/i)
        assert.match(session, /SameSite=lax/i)
        cookie = session.split(';')[0]
      }
      return result
    },
    async page(path) {
      const response = await fetch(host + path, { headers: cookie ? { cookie } : {} })
      return { status: response.status, body: await response.text() }
    },
  }
}

try {
  run('node_modules/prisma/build/index.js', ['migrate', 'deploy'])
  run('prisma/seed.mjs', [])
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', new URL(host).port], { env })
  stopped = once(server, 'exit')
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverOutput += chunk })
  let ready = false
  for (let attempt = 0; attempt < 45; attempt++) {
    if (server.exitCode !== null) break
    try { ready = (await fetch(host)).ok } catch { /* Server in avvio. */ }
    if (ready) break
    await pause(250)
  }
  assert.ok(ready, serverOutput)

  const guest = client()
  const customer = client()
  const seller = client()
  const other = client()
  const registration = client()
  assert.match((await guest.page('/')).body, /Salva il cibo/)
  assert.equal(await db.offer.count({ where: { donation: false, stock: { gt: 0 } } }), 12)
  const email = duplicateId + '@test.invalid'
  await registration.action('register', { name: 'Utente test', email, password, role: 'customer' })
  const savedUser = await db.user.findUniqueOrThrow({ where: { email } })
  assert.match(savedUser.password, /^[a-f0-9]{32}:[a-f0-9]{128}$/)
  await registration.action('logout')
  assert.equal(await db.session.count({ where: { userId: savedUser.id } }), 0)
  await registration.action('register', { name: 'Utente test', email: email.toUpperCase(), password, role: 'customer' }, 409)
  await registration.action('login', { email, password: 'errata' }, 401)
  await registration.action('login', { email, password })
  assert.match((await registration.page('/ordini')).body, /I miei ordini/)
  await guest.action('purchase', { id: 'demo-offer-1', quantity: '1' }, 401)
  await guest.action('login', credentials, 403, 'https://esempio.invalid')
  test('registrazione, email univoca, login, logout, sessioni e origine')

  await seller.action('login', { email: 'venditore@greenplate.test', password })
  await other.action('register', {
    name: 'Altro venditore', email: 'venditore-' + email, password, role: 'seller', shopName: 'Altra bottega',
    kind: 'Alimentari', address: 'Via di prova 10', city: 'Torino', shopDescription: 'Bottega di prova',
  })
  await seller.action('offer', { ...values, price: '13' }, 400)
  await seller.action('offer', { ...values, ends: values.starts }, 400)
  await seller.action('offer', values)
  const offer = await db.offer.findFirstOrThrow({ where: { title: values.title } })
  assert.equal(offer.shopId, 'demo-shop-forno')
  assert.match((await seller.page('/venditore')).body, /Test box di primavera/)
  assert.match((await guest.page('/offerte?q=primavera&city=milano&cat=misti&max=500')).body, /Test box di primavera/)
  assert.doesNotMatch((await guest.page('/offerte?q=primavera&max=350')).body, /Test box di primavera/)
  assert.match((await guest.page('/donazioni')).body, /Verdure per la donazione/)
  assert.match((await guest.page('/offerte/demo-offer-2')).body, /Informazione non indicata dal venditore/)
  test('pubblicazione, ricerca, filtri, donazioni e allergeni non dichiarati')

  await other.action('toggle', { id: offer.id, active: 'no' }, 404)
  await other.action('offer', { ...values, id: offer.id, version: offer.updated.toISOString(), price: '5.00' }, 409)
  assert.doesNotMatch((await other.page('/venditore/offerta/' + offer.id)).body, /Salva le modifiche/)
  assert.doesNotMatch((await other.page('/venditore')).body, /Test box di primavera/)
  await customer.action('login', credentials)
  assert.match((await customer.page('/venditore')).body, /Area riservata/)
  await customer.action('favorite', { id: offer.id })
  assert.match((await customer.page('/preferiti')).body, /Test box di primavera/)
  const requestId = randomUUID()
  const purchase = await customer.action('purchase', { id: offer.id, quantity: '2', total: '1', requestId })
  const duplicate = await customer.action('purchase', { id: offer.id, quantity: '2', requestId })
  assert.equal(duplicate.next, purchase.next)
  const id = purchase.next.split('/').at(-1)
  const order = await db.order.findUniqueOrThrow({ where: { id } })
  assert.deepEqual([order.total, order.fee, order.payout, order.status], [866, 173, 693, 'confirmed'])
  assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).stock, 0)
  assert.match((await guest.page('/offerte?all=sold')).body, /Test box di primavera/)
  assert.match((await customer.page(purchase.next)).body, new RegExp(order.code))
  assert.doesNotMatch((await registration.page(purchase.next)).body, new RegExp(order.code))
  await customer.action('purchase', { id: offer.id, quantity: '1' }, 409)
  await other.action('collect', { code: order.code }, 404)
  await seller.action('collect', { code: order.code }, 409)
  test('isolamento, preferiti, acquisto, scorte, calcolo server e codice')

  await customer.action('cancel', { id })
  await customer.action('cancel', { id }, 409)
  await seller.action('collect', { code: order.code }, 409)
  let latest = await db.offer.findUniqueOrThrow({ where: { id: offer.id } })
  assert.equal(latest.stock, 2)
  await seller.action('offer', { ...values, id: offer.id, version: latest.updated.toISOString(), title: 'Titolo aggiornato', price: '5.00' })
  assert.match((await customer.page(purchase.next)).body, /Test box di primavera/)
  const persisted = new PrismaClient({ datasourceUrl: url })
  try {
    const storedOrder = await persisted.order.findUniqueOrThrow({ where: { id } })
    assert.equal(storedOrder.unit, 433)
    assert.equal(storedOrder.snapshot.title, values.title)
    assert.equal(storedOrder.status, 'canceled')
    assert.equal((await persisted.offer.findUniqueOrThrow({ where: { id: offer.id } })).price, 500)
  } finally { await persisted.$disconnect() }
  test('annullamento una volta, ripristino, modifiche e persistenza degli ordini')

  const picked = await customer.action('purchase', { id: 'demo-offer-14', quantity: '1' })
  const pickup = await db.order.findUniqueOrThrow({ where: { id: picked.next.split('/').at(-1) } })
  await customer.action('cancel', { id: pickup.id }, 409)
  await other.action('collect', { code: pickup.code }, 404)
  await seller.action('collect', { code: pickup.code })
  await seller.action('collect', { code: pickup.code }, 409)
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: pickup.id } })).status, 'collected')
  assert.match((await customer.page('/ordini')).body, /7,00/)
  test('ritiro nella fascia, codice monouso e risparmio sui ritiri')

  latest = await db.offer.findUniqueOrThrow({ where: { id: offer.id } })
  await seller.action('offer', { ...values, id: offer.id, version: latest.updated.toISOString(), stock: '1' })
  const concurrent = [customer, registration].map(async account => {
    try { return await account.action('purchase', { id: offer.id, quantity: '1' }) } catch (error) {
      assert.equal(error.actual, 409)
      return null
    }
  })
  const results = await Promise.all(concurrent)
  assert.equal(results.filter(Boolean).length, 1)
  assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).stock, 0)
  const lastOrderId = results.find(Boolean).next.split('/').at(-1)
  await db.order.update({ where: { id: lastOrderId }, data: { starts: new Date(Date.now() - 7200000), ends: new Date(Date.now() - 3600000) } })
  await seller.page('/venditore')
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: lastOrderId } })).status, 'missed')
  await db.offer.update({ where: { id: offer.id }, data: { starts: new Date(Date.now() - 7200000), ends: new Date(Date.now() - 3600000), stock: 1 } })
  await customer.action('purchase', { id: offer.id, quantity: '1' }, 409)
  await seller.action('toggle', { id: offer.id, active: 'no' })
  assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).active, false)
  test('acquisti concorrenti, chiusura, mancato ritiro e disattivazione')
} catch (error) {
  console.error(serverOutput)
  throw error
} finally {
  if (server?.exitCode === null && server.signalCode === null) server.kill()
  if (stopped) await stopped
  await db.$disconnect()
  await rm(temp, { recursive: true, force: true })
}
