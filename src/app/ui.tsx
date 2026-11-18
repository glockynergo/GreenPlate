import type { Offer, Shop } from '@prisma/client'
import Link from 'next/link'
import {
  ArrowDown, ArrowRight, Carrot, ChevronRight, Clock3, Croissant, HandHeart, Heart,
  LayoutGrid, Leaf, MapPin, Package, Search, ShoppingBag, Sprout, Store, UserRound, Utensils, Wheat,
} from 'lucide-react'
import { categories, category, euro, slot } from '@/lib/catalog'
import { ActionForm, FavoriteButton } from './forms'

export type Viewer = { id: string; name: string; role: string; shop: Shop | null } | null
export type Listing = Offer & { shop: Shop }
export type SearchParams = Record<string, string | string[] | undefined>
export const first = (value: SearchParams[string]) => typeof value === 'string' ? value : value?.[0] ?? ''
const icons = { Wheat, Carrot, Utensils, Croissant, Package }

export function Brand() {
  return <Link href="/" className="brand" aria-label="GreenPlate, home"><span className="brand-icon"><Sprout size={24} strokeWidth={2.4} /></span><span>Green<span>Plate</span></span></Link>
}

export function Header({ user, route }: { user: Viewer; route: string }) {
  return <header className="site-header" id="inizio">
    <div className="container header-inner">
      <Brand />
      <nav aria-label="Principale" className="main-nav">
        <Link href="/offerte" aria-current={route === 'offerte' ? 'page' : undefined}>Offerte</Link>
        <Link href="/#come-funziona">Come funziona</Link>
        <Link href="/donazioni" aria-current={route === 'donazioni' ? 'page' : undefined}>Donazioni</Link>
      </nav>
      <div className="header-actions">
        {!user ? <>
          <Link href="/accedi" className="nav-login"><UserRound size={17} /> Accedi</Link>
          <Link href="/registrati" className="button primary small">Registrati</Link>
        </> : <>
          {user.role === 'seller' ? <Link href="/venditore" className="nav-login"><Store size={17} /> <span>Dashboard</span></Link> :
            <><Link href="/preferiti" className="nav-login" title="Preferiti" aria-label="Preferiti"><Heart size={18} /></Link>
              <Link href="/ordini" className="nav-login"><ShoppingBag size={17} /> <span>Ordini</span></Link></>}
          <ActionForm action="logout" className="logout"><button className="button outline small">Esci</button></ActionForm>
        </>}
      </div>
    </div>
  </header>
}

export function Footer() {
  return <footer className="site-footer"><div className="container footer-inner">
    <Brand /><p>Una seconda occasione per il buon cibo.</p>
    <div><Link href="/offerte">Offerte</Link><Link href="/donazioni">Donazioni</Link><Link href="/#venditori">Per i commercianti</Link></div>
  </div></footer>
}

export function Hero({ discount }: { discount: number }) {
  return <section className="hero">
    <div className="container hero-grid">
      <div className="hero-copy">
        <div className="eyebrow"><Leaf size={15} /> MENO SPRECO, PIÙ GUSTO</div>
        <h1>Salva il cibo,<br /><span>risparmia<br className="hero-mobile-break" /> ogni giorno</span></h1>
        <p>Scopri il cibo invenduto di negozi e locali, prenotalo a un prezzo scontato e ritiralo in negozio.</p>
        <div className="hero-actions">
          <Link className="button primary" href="#offerte">Scopri le offerte <ArrowDown size={17} /></Link>
          <Link className="button outline" href="#venditori">Sei un commerciante? <ArrowRight size={16} /></Link>
        </div>
      </div>
      <div className="hero-picture">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.webp" alt="Pane artigianale, pomodori e verdure fresche in una borsa di carta" fetchPriority="high" />
        {discount > 0 && <div className="hero-discount"><span>FINO AL</span><strong>{discount}%</strong><span>DI SCONTO</span></div>}
      </div>
    </div>
  </section>
}

function hrefFor(path: string, params: SearchParams, key: string, value: string) {
  const get = new URLSearchParams()
  for (const item of ['q', 'city', 'cat', 'max', 'all']) {
    const current = item === key ? value : first(params[item])
    if (current) get.set(item, current)
  }
  return `${path}${get.size ? '?' + get.toString() : ''}#offerte`
}

export function Filters({ params, home }: { params: SearchParams; home: boolean }) {
  const path = home ? '/' : '/offerte'
  const cat = first(params.cat)
  const max = first(params.max)
  const all = first(params.all)
  return <>
    <form method="get" action={path + '#offerte'} className="search-bar">
      <label className="search-field"><Search size={20} /><span><b>Cosa cerchi?</b><input name="q" defaultValue={first(params.q)} maxLength={100} placeholder="Prodotto o negozio" /></span></label>
      <label className="search-field"><MapPin size={20} /><span><b>Dove?</b><input name="city" defaultValue={first(params.city)} maxLength={80} placeholder="Tutte le città" /></span></label>
      <label className="search-field search-category"><LayoutGrid size={18} /><span><b>Categoria</b><select name="cat" defaultValue={cat} aria-label="Categoria"><option value="">Tutte le categorie</option>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></span></label>
      {max && <input type="hidden" name="max" value={max} />}
      {all && <input type="hidden" name="all" value={all} />}
      <button className="button primary" type="submit"><Search size={18} /> Cerca offerte</button>
    </form>
    <nav className="chips" aria-label="Categorie">
      <Link href={hrefFor(path, params, 'cat', '')} className={'chip ' + (!cat ? 'selected' : '')} aria-current={!cat ? 'true' : undefined}><LayoutGrid size={17} /> Tutte</Link>
      {categories.map(item => {
        const Icon = icons[item.icon as keyof typeof icons]
        return <Link key={item.id} href={hrefFor(path, params, 'cat', item.id)} className={'chip ' + (cat === item.id ? 'selected' : '')} aria-current={cat === item.id ? 'true' : undefined}><Icon size={17} /> {item.label}</Link>
      })}
    </nav>
  </>
}

export function ExtraFilters({ params, home }: { params: SearchParams; home: boolean }) {
  return <form className="extra-filters" action={(home ? '/' : '/offerte') + '#offerte'} method="get">
    {['q', 'city', 'cat'].map(key => <input key={key} type="hidden" name={key} value={first(params[key])} />)}
    <label><span className="sr-only">Prezzo massimo</span><select name="max" aria-label="Prezzo massimo" defaultValue={first(params.max)}>
      <option value="">Tutti i prezzi</option><option value="350">Fino a 3,50 €</option><option value="500">Fino a 5,00 €</option><option value="1000">Fino a 10,00 €</option>
    </select></label>
    <label><span className="sr-only">Disponibilità</span><select name="all" aria-label="Disponibilità" defaultValue={first(params.all)}>
      <option value="">Disponibili</option><option value="yes">Anche esauriti</option><option value="sold">Solo esauriti</option>
    </select></label>
    <button className="button outline small">Filtra</button>
  </form>
}

export function Photo({ offer, className }: { offer: Listing; className?: string }) {
  const fallback = category(offer.category)?.image ?? '/images/misti.webp'
  return <div className={className ?? 'offer-photo'} style={{ backgroundImage: `url(${fallback})` }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={offer.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
  </div>
}

export function OfferCard({ offer, user, saved }: { offer: Listing; user: Viewer; saved: boolean }) {
  const href = `/offerte/${offer.id}`
  const isClosed = offer.ends <= new Date()
  const discount = Math.round(100 - offer.price / offer.original * 100)
  return <article className="offer-card">
    <div className="picture-wrap">
      <Link href={href} tabIndex={-1} aria-hidden="true"><Photo offer={offer} /></Link>
      <span className={'discount ' + (offer.donation ? 'donating' : '')}>{offer.donation ? 'Donazione' : `−${discount}%`}</span>
      {!offer.donation && (user?.role === 'customer' ? <FavoriteButton id={offer.id} saved={saved} /> : !user &&
        <Link href={`/accedi?next=${encodeURIComponent(href)}`} className="favorite" aria-label="Accedi per salvare nei preferiti" title="Accedi per salvare nei preferiti"><Heart size={20} /></Link>)}
    </div>
    <div className="offer-content">
      <div className="card-tags"><span>{category(offer.category)?.label}</span>{offer.shop.demo && <small>Demo</small>}</div>
      <h3><Link href={href}>{offer.title}</Link></h3>
      <div className="store-location"><MapPin size={15} /> {offer.shop.name} · {offer.shop.city}</div>
      <p>{offer.description}</p>
      <div className="offer-time"><Clock3 size={16} /> {slot(offer.starts, offer.ends)}</div>
      <div className="card-bottom">
        {offer.donation ? <strong className="availability">{offer.stock} disponibili</strong> :
          <div className="prices"><strong>{euro(offer.price)}</strong><del>{euro(offer.original)}</del></div>}
        {!offer.donation && <span className={offer.stock && !isClosed ? 'availability' : 'availability unavailable'}>{isClosed ? 'Terminata' : offer.stock ? `${offer.stock} disponibil${offer.stock === 1 ? 'e' : 'i'}` : 'Esaurita'}</span>}
        <Link href={href} className="icon-link" aria-label={`Dettaglio: ${offer.title}`}><ChevronRight size={19} /></Link>
      </div>
    </div>
  </article>
}

export function HowItWorks() {
  const steps = [
    { icon: Search, title: 'Scegli', text: 'Trova un’offerta nella tua città e leggi cosa contiene.' },
    { icon: ShoppingBag, title: 'Prenota', text: 'Seleziona la quantità e conferma l’ordine simulato.' },
    { icon: MapPin, title: 'Ritira', text: 'Mostra il codice in negozio durante la fascia indicata.' },
  ]
  return <>
    <section id="come-funziona" className="how"><div className="container">
      <h2>Come funziona</h2>
      <div className="steps">{steps.map(({ icon: Icon, title, text }) => <article key={title} className="panel step"><span className="step-icon"><Icon size={24} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </div></section>
    <section id="venditori" className="container benefits">
      <div><span className="step-icon"><HandHeart size={23} /></span><h2>Più valore a fine giornata</h2><p>Chi compra spende meno e sceglie cosa portare a casa. Chi vende recupera valore dal cibo rimasto e decide contenuto, prezzo e orario.</p></div>
      <div><p>Ai commercianti va l’80% di ogni vendita. GreenPlate trattiene il 20%. Nessun canone mensile.</p>
        <Link className="button primary" href="/registrati?ruolo=venditore">Apri un account venditore <ArrowRight size={18} /></Link>
      </div>
    </section>
  </>
}

export function Empty({ title, children, href, label }: { title: string; children: React.ReactNode; href?: string; label?: string }) {
  return <div className="panel empty"><Package size={30} /><h2>{title}</h2><p>{children}</p>{href && <Link className="button outline" href={href}>{label}</Link>}</div>
}

export function Back({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="back"><ArrowRight size={16} /> {children}</Link>
}
