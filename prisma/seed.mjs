import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'
import { DateTime } from 'luxon'

if (process.env.DEMO_MODE !== 'true') {
  console.error('Imposta DEMO_MODE=true soltanto nel tuo ambiente locale.')
  process.exit(1)
}
const db = new PrismaClient()
const demoPassword = 'GreenPlate2026!'
const shops = [
  ['forno', 'Giulia', 'Forno Brera', 'Panificio', 'Via Solferino 12', 'Milano', 'Pane a lievitazione naturale, focacce e lievitati.'],
  ['orto', 'Giovanni', 'L’Orto di Via Padova', 'Ortofrutta', 'Via Padova 64', 'Milano', 'Frutta e verdura di stagione selezionate al mercato.'],
  ['tavola', 'Sara', 'Tavola Verde', 'Gastronomia', 'Via Savona 22', 'Milano', 'Piatti pronti di ispirazione mediterranea.'],
  ['dolci', 'Carla', 'Nuvola Pasticceria', 'Pasticceria', 'Via del Pratello 31', 'Bologna', 'Pasticceria artigianale e colazioni.'],
  ['misto', 'Paolo', 'La Bottega Gentile', 'Alimentari', 'Via Ostiense 74', 'Roma', 'Una bottega di quartiere con specialità fresche.'],
  ['roma', 'Teresa', 'Forno dei Tigli', 'Panificio', 'Via Appia Nuova 38', 'Roma', 'Pane, pizza in teglia e dolci da forno.'],
]
const offers = [
  ['forno', 'Box del fornaio', 'Pane rustico, focaccia al rosmarino e panini artigianali del giorno.', 'forno', 1200, 399, 5, 'Farina di frumento, acqua, lievito madre, olio d’oliva, sale, rosmarino.', 'Frumento (glutine).', 'Conservare in luogo fresco e asciutto.'],
  ['orto', 'Cassetta di stagione', 'Una selezione di verdure fresche per fare il pieno di colore.', 'ortofrutta', 1500, 499, 8, 'Zucchine, pomodori, carote, limoni e insalata.', '', 'Tenere al fresco.'],
  ['tavola', 'Pranzo mediterraneo', 'Pasta al pesto di basilico, pomodorini e verdure grigliate.', 'pronti', 1300, 449, 3, 'Pasta di grano duro, basilico, pinoli, formaggio, pomodori, melanzane.', 'Frumento (glutine), latte, pinoli.', 'Conservare in frigorifero a 4 °C.'],
  ['dolci', 'Box dolce risveglio', 'Due croissant al burro e una fetta di torta al cioccolato.', 'dolci', 1100, 349, 6, 'Farina di frumento, burro, uova, zucchero, cioccolato.', 'Frumento (glutine), latte, uova.', 'Consumare in giornata.'],
  ['misto', 'Box aperitivo', 'Crostini, hummus di ceci e verdure di stagione.', 'misti', 1600, 549, 5, 'Frumento, ceci, sesamo, olio, limone, verdure miste.', 'Frumento (glutine), sesamo.', 'Tenere in frigorifero.'],
  ['roma', 'Pizza in teglia', 'Due tranci, uno al pomodoro e uno con patate e rosmarino.', 'forno', 1000, 350, 7, 'Farina di frumento, pomodoro, patate, rosmarino, olio, lievito.', 'Frumento (glutine).', 'Riscaldare prima di servire.'],
  ['forno', 'Pane e focaccia', 'Due panini ai cereali e una fetta di focaccia alle olive.', 'forno', 850, 299, 6, 'Farina di frumento, semi di sesamo, olive, olio, sale.', 'Frumento (glutine), sesamo.', 'Conservare in luogo asciutto.'],
  ['tavola', 'Couscous alle verdure', 'Una porzione con ceci, zucchine, carote e menta.', 'pronti', 1050, 399, 4, 'Semola di grano, ceci, zucchine, carote, menta, olio.', 'Frumento (glutine).', 'Conservare in frigorifero.'],
  ['orto', 'Frutta da colazione', 'Mele, pere e mandarini pronti per la prossima colazione.', 'ortofrutta', 900, 299, 4, 'Mele, pere e mandarini.', '', 'Tenere al fresco.'],
  ['dolci', 'Merenda artigianale', 'Tre biscotti al cacao e due fette di crostata alla confettura.', 'dolci', 1000, 375, 5, 'Farina, uova, burro, cacao, confettura di albicocca.', 'Frumento (glutine), uova, latte.', 'Conservare in un contenitore chiuso.'],
  ['misto', 'Box per due', 'Insalata di farro, hummus e due panini integrali.', 'misti', 1800, 625, 4, 'Farro, ceci, sesamo, frumento, pomodorini, olio.', 'Farro e frumento (glutine), sesamo.', 'Conservare in frigorifero.'],
  ['roma', 'Focaccia e grissini', 'Focaccia al sale grosso e grissini al sesamo.', 'forno', 750, 250, 0, 'Farina, semi di sesamo, olio, sale, lievito.', 'Frumento (glutine), sesamo.', 'Conservare in luogo asciutto.'],
  ['orto', 'Verdure per la donazione', 'Una cassetta di zucchine, carote e finocchi.', 'ortofrutta', 1100, 300, 2, 'Zucchine, carote, finocchi.', '', 'Tenere al fresco.', true],
  ['forno', 'Box ritiro immediato', 'Una pagnotta e due focaccine. Fascia già iniziata, ideale per provare il ritiro.', 'forno', 1050, 350, 8, 'Farina di frumento, olio, lievito, sale.', 'Frumento (glutine).', 'Conservare in luogo asciutto.'],
]
const now = DateTime.now().setZone('Europe/Rome')
const at = (minutes) => now.plus({ minutes }).startOf('minute').toJSDate()
function hash(password) {
  const salt = randomBytes(16).toString('hex')
  return salt + ':' + scryptSync(password, salt, 64).toString('hex')
}

try {
  await db.$transaction(async tx => {
    await tx.user.upsert({
      where: { id: 'demo-customer' }, update: {},
      create: { id: 'demo-customer', name: 'Andrea', email: 'cliente@greenplate.test', password: hash(demoPassword), role: 'customer', demo: true },
    })
    for (const [id, owner, name, kind, address, city, description] of shops) {
      await tx.user.upsert({
        where: { id: 'demo-seller-' + id }, update: {},
        create: { id: 'demo-seller-' + id, name: owner, email: id === 'forno' ? 'venditore@greenplate.test' : id + '@greenplate.test', password: hash(id === 'forno' ? demoPassword : randomBytes(24).toString('hex')), role: 'seller', demo: true,
          shop: { create: { id: 'demo-shop-' + id, name, kind, address, city, description, demo: true } } },
      })
    }
    for (const [index, [shop, title, description, category, original, price, stock, ingredients, allergens, storage, donation = false]] of offers.entries()) {
      const starts = at(index === 13 ? -10 : 160 + (index % 5) * 30)
      const ends = index === 13 ? at(180) : new Date(starts.getTime() + 90 * 60_000)
      await tx.offer.upsert({
        where: { id: 'demo-offer-' + (index + 1) }, update: {},
        create: {
          id: 'demo-offer-' + (index + 1), shopId: 'demo-shop-' + shop, title, description, category,
          image: '/images/' + category + '.webp', original, price, stock, ingredients, allergens, storage, starts, ends, donation,
        },
      })
    }
  }, { timeout: 15000 })
  console.log('Dati dimostrativi pronti. Il seed conserva dati e fasce già presenti.')
} finally {
  await db.$disconnect()
}
