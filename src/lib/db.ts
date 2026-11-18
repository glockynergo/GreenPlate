import { PrismaClient } from '@prisma/client'

const globalDb = globalThis as typeof globalThis & { greenplate?: PrismaClient }
export const db = globalDb.greenplate ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalDb.greenplate = db
