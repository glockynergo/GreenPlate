import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { db } from './db'
import { InputError } from './input'

export async function purchase(userId: string, offerId: string, quantity: number, requestId: string) {
  try {
    return await db.$transaction(async tx => {
      const changed = await tx.offer.updateMany({
        where: { id: offerId, active: true, donation: false, ends: { gt: new Date() }, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      })
      if (!changed.count) throw new InputError('L’offerta è terminata o la quantità non è più disponibile.', 409)
      const offer = await tx.offer.findUniqueOrThrow({ where: { id: offerId }, include: { shop: true } })
      if (offer.ends <= new Date()) throw new InputError('La fascia di ritiro è terminata.', 409)
      const total = offer.price * quantity
      const fee = Math.round(total / 5)
      return tx.order.create({
        data: {
          id: requestId, userId, offerId, shopId: offer.shopId,
          quantity, unit: offer.price, original: offer.original,
          total, fee, payout: total - fee, starts: offer.starts, ends: offer.ends,
          code: randomBytes(8).toString('hex').toUpperCase(),
          snapshot: {
            title: offer.title, description: offer.description, category: offer.category, image: offer.image,
            ingredients: offer.ingredients, allergens: offer.allergens, storage: offer.storage,
            shop: offer.shop.name, address: offer.shop.address, city: offer.shop.city, demo: offer.shop.demo,
          },
        },
      })
    })
  } catch (error) {
    const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    if (!duplicate && !(error instanceof InputError)) throw error
    const previous = await db.order.findFirst({ where: { id: requestId, userId, offerId, quantity } })
    if (previous) return previous
    if (duplicate) throw new InputError('Richiesta già utilizzata. Ricarica l’offerta per inviare un nuovo ordine.', 409)
    throw error
  }
}

export async function cancel(userId: string, id: string) {
  await db.$transaction(async tx => {
    const changed = await tx.order.updateMany({
      where: { id, userId, status: 'confirmed', starts: { gt: new Date() } },
      data: { status: 'canceled' },
    })
    if (!changed.count) throw new InputError('Puoi annullare un tuo ordine confermato prima dell’inizio del ritiro.', 409)
    const order = await tx.order.findUniqueOrThrow({ where: { id } })
    if (order.starts <= new Date()) throw new InputError('La fascia di ritiro è già iniziata.', 409)
    await tx.offer.update({ where: { id: order.offerId }, data: { stock: { increment: order.quantity } } })
  })
}

export async function collect(shopId: string, code: string) {
  const now = new Date()
  const changed = await db.order.updateMany({
    where: { shopId, code, status: 'confirmed', starts: { lte: now }, ends: { gt: now } },
    data: { status: 'collected' },
  })
  if (changed.count) return
  const order = await db.order.findFirst({ where: { shopId, code } })
  if (!order) throw new InputError('Codice di ritiro non trovato per questa attività.', 404)
  if (order.status !== 'confirmed') throw new InputError('Il codice non è più utilizzabile.', 409)
  throw new InputError('La conferma è possibile solo durante la fascia di ritiro.', 409)
}

export async function expire(filter: { userId: string } | { shopId: string }) {
  const where = { ...filter, status: 'confirmed', ends: { lte: new Date() } }
  if (await db.order.findFirst({ where, select: { id: true } })) {
    await db.order.updateMany({ where, data: { status: 'missed' } })
  }
}
