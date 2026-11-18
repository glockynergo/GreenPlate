import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { db } from './db'

const derive = promisify(scrypt)
export const cookie = 'greenplate_session'
export const lifetime = 7 * 24 * 60 * 60
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString('hex')}`
}
export async function verifyPassword(password: string, record: string) {
  const [salt, key] = record.split(':')
  return timingSafeEqual((await derive(password, salt, 64)) as Buffer, Buffer.from(key, 'hex'))
}
export async function currentUser() {
  const token = (await cookies()).get(cookie)?.value
  if (!token) return null
  const session = await db.session.findFirst({
    where: { tokenHash: digest(token), expires: { gt: new Date() } },
    include: { user: { select: { id: true, name: true, role: true, demo: true, shop: true } } },
  })
  if (session?.user.demo && process.env.DEMO_MODE !== 'true') return null
  return session?.user ?? null
}
export async function startSession(userId: string, previous?: string) {
  const token = randomBytes(32).toString('hex')
  await db.$transaction([
    db.session.deleteMany({ where: { OR: [{ expires: { lte: new Date() } }, ...(previous ? [{ tokenHash: digest(previous) }] : [])] } }),
    db.session.create({ data: { tokenHash: digest(token), userId, expires: new Date(Date.now() + lifetime * 1000) } }),
  ])
  return token
}
export const cookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: process.env.COOKIE_SECURE !== 'false' }
