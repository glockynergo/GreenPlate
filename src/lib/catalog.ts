import { DateTime } from 'luxon'

export const categories = [
  { id: 'forno', label: 'Pane e forno', image: '/images/forno.webp', icon: 'Wheat' },
  { id: 'ortofrutta', label: 'Frutta e verdura', image: '/images/ortofrutta.webp', icon: 'Carrot' },
  { id: 'pronti', label: 'Pasti pronti', image: '/images/pronti.webp', icon: 'Utensils' },
  { id: 'dolci', label: 'Dolci', image: '/images/dolci.webp', icon: 'Croissant' },
  { id: 'misti', label: 'Box misti', image: '/images/misti.webp', icon: 'Package' },
]
export const euro = (cents: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100)
export const category = (id: string) => categories.find(item => item.id === id)
export const zone = 'Europe/Rome'
export const rome = (date: Date) => DateTime.fromJSDate(date, { zone }).setLocale('it')
export const local = (date: Date) => rome(date).toFormat("yyyy-MM-dd'T'HH:mm")
export function slot(starts: Date, ends: Date) {
  const start = rome(starts)
  const end = rome(ends)
  const day = start.hasSame(DateTime.now().setZone(zone), 'day') ? 'Oggi' : start.toFormat('d MMM')
  return `${day}, ${start.toFormat('HH:mm')}–${end.hasSame(start, 'day') ? end.toFormat('HH:mm') : end.toFormat('d MMM HH:mm')}`
}
export const statusLabel: Record<string, string> = { confirmed: 'Confermato', collected: 'Ritirato', canceled: 'Annullato', missed: 'Non ritirato' }
