import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { cookie, cookieOptions, currentUser, digest, hashPassword, lifetime, startSession, verifyPassword } from '@/lib/auth'
import { db } from '@/lib/db'
import { InputError, number, offerInput, read, shopInput } from '@/lib/input'
import { cancel, collect, purchase } from '@/lib/orders'

const done = (message: string, next?: string) => NextResponse.json({ message, next })

function safeOfferReturn(data: FormData) {
  const next = data.get('next')
  return typeof next === 'string' && /^\/offerte\/[a-zA-Z0-9-]+$/.test(next) ? next : undefined
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    const originHost = origin && new URL(origin).host
    if (!originHost || (originHost !== host && originHost !== request.nextUrl.host && origin !== process.env.APP_ORIGIN)) {
      throw new InputError('Richiesta non autorizzata.', 403)
    }

    const data = await request.formData()
    const action = read(data, 'action', 'Azione', 24)
    const previous = request.cookies.get(cookie)?.value
    if (action === 'logout') {
      if (previous) await db.session.deleteMany({ where: { tokenHash: digest(previous) } })
      const response = done('Hai effettuato l’uscita.', '/')
      response.cookies.set(cookie, '', { ...cookieOptions, maxAge: 0 })
      return response
    }

    if (action === 'login' || action === 'register') {
      const email = read(data, 'email', 'Email', 254).toLowerCase()
      const password = data.get('password')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || !password || password.length > 128) {
        throw new InputError('Controlla l’email e la password.')
      }
      let user
      if (action === 'register') {
        const role = read(data, 'role', 'Ruolo', 10)
        if (role !== 'customer' && role !== 'seller') throw new InputError('Seleziona un ruolo valido.')
        if (password.length < 10) throw new InputError('Usa una password di almeno 10 caratteri.')
        const name = read(data, 'name', 'Nome', 80)
        const shop = role === 'seller' ? { create: shopInput(data) } : undefined
        user = await db.user.create({ data: { role, email, name, password: await hashPassword(password), shop } })
      } else {
        user = await db.user.findUnique({ where: { email } })
        const dummy = '00000000000000000000000000000000:' + '0'.repeat(128)
        const valid = await verifyPassword(password, user?.password ?? dummy)
        if (!valid || !user || (user.demo && process.env.DEMO_MODE !== 'true')) throw new InputError('Email o password non corrette.', 401)
      }
      const token = await startSession(user.id, previous)
      const response = done('Accesso effettuato.', user.role === 'seller' ? '/venditore' : safeOfferReturn(data) ?? '/offerte')
      response.cookies.set(cookie, token, { ...cookieOptions, maxAge: lifetime })
      return response
    }

    const user = await currentUser()
    if (!user) throw new InputError('Accedi al tuo account per continuare.', 401)
    if (user.role === 'customer') {
      if (action === 'favorite') {
        const offerId = read(data, 'id', 'Offerta', 80)
        if (data.get('remove') === 'yes') {
          await db.favorite.deleteMany({ where: { userId: user.id, offerId } })
          return done('Offerta rimossa dai preferiti.')
        }
        if (!await db.offer.findFirst({ where: { id: offerId, active: true, donation: false } })) throw new InputError('Offerta non disponibile.', 404)
        await db.favorite.upsert({ where: { userId_offerId: { userId: user.id, offerId } }, update: {}, create: { userId: user.id, offerId } })
        return done('Offerta salvata nei preferiti.')
      }
      if (action === 'purchase') {
        const offerId = read(data, 'id', 'Offerta', 80)
        const requestId = read(data, 'requestId', 'Prenotazione', 36)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) {
          throw new InputError('Ricarica l’offerta per inviare la prenotazione.')
        }
        const order = await purchase(user.id, offerId, number(data, 'quantity', 1, 10000), requestId)
        return done('Prenotazione confermata.', `/ordini/${order.id}`)
      }
      if (action === 'cancel') {
        await cancel(user.id, read(data, 'id', 'Ordine', 80))
        return done('Ordine annullato. La disponibilità è stata ripristinata.')
      }
    }
    if (user.role === 'seller' && user.shop) {
      const shopId = user.shop.id
      if (action === 'shop') {
        await db.shop.update({ where: { id: shopId }, data: shopInput(data) })
        return done('Dati dell’attività aggiornati.', '/venditore')
      }
      if (action === 'offer') {
        const id = read(data, 'id', 'Offerta', 80, false)
        const values = offerInput(data)
        if (id) {
          const version = new Date(read(data, 'version', 'Versione', 32))
          if (!Number.isFinite(version.getTime())) throw new InputError('Ricarica la pagina e riprova.')
          const updated = await db.offer.updateMany({ where: { id, shopId, updated: version }, data: values })
          if (!updated.count) throw new InputError('Offerta non accessibile o aggiornata nel frattempo. Ricarica la pagina.', 409)
        } else {
          await db.offer.create({ data: { ...values, shopId } })
        }
        return done('Offerta salvata.', '/venditore')
      }
      if (action === 'toggle') {
        const changed = await db.offer.updateMany({
          where: { id: read(data, 'id', 'Offerta', 80), shopId },
          data: { active: data.get('active') === 'yes' },
        })
        if (!changed.count) throw new InputError('Offerta non accessibile.', 404)
        return done('Visibilità aggiornata.')
      }
      if (action === 'collect') {
        const code = read(data, 'code', 'Codice', 24).toUpperCase()
        if (!/^[A-F0-9]{16}$/.test(code)) throw new InputError('Inserisci il codice di 16 caratteri mostrato dal cliente.')
        await collect(shopId, code)
        return done('Ritiro confermato.')
      }
    }
    throw new InputError('Il tuo account non ha accesso a questa funzione.', 403)
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && (error.meta?.target as string[] | undefined)?.includes('email')) {
        return NextResponse.json({ error: 'Esiste già un account con questa email.' }, { status: 409 })
      }
      if (['P1008', 'P2028', 'P2034'].includes(error.code)) {
        return NextResponse.json({ error: 'Il database è impegnato. Controlla lo stato e riprova.' }, { status: 503 })
      }
    }
    console.error(error)
    return NextResponse.json({ error: 'Si è verificato un problema. Riprova tra poco.' }, { status: 500 })
  }
}
