import { DateTime } from 'luxon'
import { category, zone } from './catalog'

export class InputError extends Error {
  constructor(message: string) { super(message) }
}
export function read(data: FormData, key: string, label: string, max: number, required = true) {
  const field = data.get(key)
  const value = typeof field === 'string' ? field.trim() : ''
  if (required && !value) throw new InputError(`Compila il campo «${label}».`)
  if (value.length > max) throw new InputError(`Il campo «${label}» è troppo lungo.`)
  return value
}
export function number(data: FormData, key: string, min: number, max: number) {
  const raw = read(data, key, 'Quantità', 5)
  const value = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < min || value > max) {
    throw new InputError(`Inserisci una quantità tra ${min} e ${max}.`)
  }
  return value
}
export function cents(data: FormData, key: string) {
  const raw = read(data, key, 'Prezzo', 10).replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) throw new InputError('Inserisci un prezzo fino a 999,99 € con al massimo due decimali.')
  const [whole, fraction = ''] = raw.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
function pickup(data: FormData, key: string) {
  const raw = read(data, key, 'Orario di ritiro', 16)
  const value = DateTime.fromISO(raw, { zone })
  if (!value.isValid || value.toFormat("yyyy-MM-dd'T'HH:mm") !== raw || value.getPossibleOffsets().length !== 1) {
    throw new InputError('Inserisci un orario locale valido e univoco (Europe/Rome).')
  }
  return value.toJSDate()
}
export function shopInput(data: FormData) {
  return {
    name: read(data, 'shopName', 'Nome attività', 100),
    kind: read(data, 'kind', 'Tipologia', 80),
    address: read(data, 'address', 'Indirizzo', 140),
    city: read(data, 'city', 'Città', 80),
    description: read(data, 'shopDescription', 'Descrizione attività', 600),
  }
}
export function offerInput(data: FormData, now = new Date()) {
  const type = read(data, 'category', 'Categoria', 30)
  const entry = category(type)
  if (!entry) throw new InputError('Seleziona una categoria valida.')
  let image = read(data, 'image', 'Immagine', 500, false)
  if (image) {
    try {
      const url = new URL(image)
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error()
      image = url.href
    }
    catch { throw new InputError('Inserisci un indirizzo immagine HTTPS valido.') }
  }
  const original = cents(data, 'original')
  const price = cents(data, 'price')
  if (price < 1 || original <= price) throw new InputError('Il prezzo scontato deve essere positivo e inferiore al prezzo originale.')
  const starts = pickup(data, 'starts')
  const ends = pickup(data, 'ends')
  if (ends <= starts || ends <= now) throw new InputError('La fine del ritiro deve essere futura e successiva all’inizio.')
  return {
    title: read(data, 'title', 'Titolo', 100),
    description: read(data, 'description', 'Descrizione', 700),
    category: type, image: image || entry.image, original, price, starts, ends,
    stock: number(data, 'stock', 0, 10000),
    ingredients: read(data, 'ingredients', 'Ingredienti', 700, false),
    allergens: read(data, 'allergens', 'Allergeni', 700, false),
    storage: read(data, 'storage', 'Conservazione', 500, false),
    donation: data.get('donation') === 'on',
  }
}
