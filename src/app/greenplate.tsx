'use client'

import type { DemoState, Offer, Order } from '@/lib/demo-types'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, CalendarClock, Clock3, HandHeart, Heart, MapPin, Package, Plus, Receipt, ShoppingBag, Store, Wallet } from 'lucide-react'
import { category, euro, local, slot, statusLabel } from '@/lib/catalog'
import { currentProfile, withOrderStatus } from '@/lib/demo'
import { useDemo } from './demo-provider'
import { AccountForm, ActionForm, Checkout, DemoAccess, FavoriteButton, OfferForm, ShopInputs } from './forms'
import { Back, Empty, ExtraFilters, Filters, Footer, Header, Hero, HowItWorks, OfferCard, Photo, first } from './ui'
import type { Listing, SearchParams, Viewer } from './ui'

type DemoView = { state: DemoState; user: Viewer; now: Date }

const normalize = (value: string) => value.trim().toLocaleLowerCase('it').normalize('NFD').replace(/\p{M}/gu, '')
const available = (offer: Offer, now: Date) => offer.active && offer.ends > now

function listings(state: DemoState): Listing[] {
  const shops = new Map(state.shops.map(shop => [shop.id, shop]))
  return state.offers.flatMap(offer => {
    const shop = shops.get(offer.shopId)
    return shop ? [{ ...offer, shop }] : []
  })
}

function Catalog({ params, user, home, state, now }: DemoView & { params: SearchParams; home: boolean }) {
  const q = normalize(first(params.q).slice(0, 100))
  const city = normalize(first(params.city).slice(0, 80))
  const cat = category(first(params.cat))?.id
  const max = Number(first(params.max))
  const all = first(params.all)
  const catalog = listings(state).filter(offer => !offer.donation && available(offer, now))
  const offers = catalog.filter(offer =>
    (all === 'yes' || (all === 'sold' ? offer.stock === 0 : offer.stock > 0)) &&
    (!q || [offer.title, offer.shop.name, offer.shop.city].some(text => normalize(text).includes(q))) &&
    (!city || normalize(offer.shop.city).includes(city)) &&
    (!cat || offer.category === cat) &&
    (!Number.isInteger(max) || max <= 0 || offer.price <= max),
  ).sort((a, b) => a.starts.getTime() - b.starts.getTime() || a.title.localeCompare(b.title, 'it'))
  const saved = new Set(state.favorites.filter(item => item.userId === user?.id).map(item => item.offerId))
  const deals = catalog.filter(offer => offer.stock > 0)
  const discount = deals.reduce((max, item) => Math.max(max, Math.round(100 - item.price / item.original * 100)), 0)
  const featured = home && !['q', 'city', 'cat', 'max', 'all'].some(key => first(params[key]))
  const sorted = featured ? [...offers].sort((a, b) => {
    const priority = (id: string) => ['demo-offer-1', 'demo-offer-2', 'demo-offer-3', 'demo-offer-4'].includes(id) ? Number(id.split('-').at(-1)) : 10
    return priority(a.id) - priority(b.id)
  }) : offers
  const displayed = featured ? sorted.slice(0, 6) : sorted
  return <>
    {home && <Hero discount={discount} />}
    <section id="offerte" className={'container catalog ' + (home ? 'catalog-home' : '')} aria-labelledby="offer-heading">
      {!home && <div className="page-intro"><h1>Scopri le offerte</h1><p>Trova il cibo da recuperare vicino a te.</p></div>}
      <Filters params={params} home={home} />
      <div className="section-heading">
        <div>{home ? <h2 id="offer-heading">{featured ? 'Offerte in evidenza' : 'Risultati della ricerca'}</h2> : <h2 id="offer-heading">Tutte le offerte</h2>}
          <p>{featured ? 'Buone occasioni da ritirare in negozio.' : `${offers.length} ${offers.length === 1 ? 'offerta trovata' : 'offerte trovate'}`}</p></div>
        <ExtraFilters params={params} home={home} />
      </div>
      {displayed.length ? <div className="cards">{displayed.map(offer => <OfferCard key={offer.id} offer={offer} user={user} saved={saved.has(offer.id)} />)}</div> :
        <Empty title="Nessuna offerta trovata" href="/offerte" label="Azzera i filtri">Prova un’altra città, una categoria diversa o un prezzo più alto.</Empty>}
      {featured && offers.length > displayed.length && <div className="center"><Link className="button outline" href="/offerte">Vedi tutte le offerte <ArrowRight size={17} /></Link></div>}
    </section>
    {home && <HowItWorks />}
  </>
}

function Detail({ id, user, state, now }: DemoView & { id: string }) {
  const offer = listings(state).find(item => item.id === id && item.active)
  if (!offer) return <Missing />
  const saved = state.favorites.some(item => item.offerId === id && item.userId === user?.id)
  const closed = offer.ends <= now
  const buyable = !closed && offer.stock > 0 && !offer.donation
  const href = `/offerte/${offer.id}`
  return <div className="container page">
    <Back href={offer.donation ? '/donazioni' : '/offerte'}>{offer.donation ? 'Torna alle donazioni' : 'Torna alle offerte'}</Back>
    <div className="detail-grid">
      <div>
        <div className="picture-wrap detail-picture">
          <Photo offer={offer} className="detail-photo" />
          {!offer.donation && (user?.role === 'customer' ? <FavoriteButton id={id} saved={!!saved} /> : !user &&
            <Link href={`/accedi?next=${encodeURIComponent(href)}`} className="favorite" aria-label="Accedi per salvare nei preferiti"><Heart size={20} /></Link>)}
        </div>
        <section className="panel content-details">
          <h2>Cosa contiene</h2><p>{offer.description}</p>
          <dl className="details-list">
            <div><dt>Ingredienti</dt><dd>{offer.ingredients || 'Non indicati dal venditore. Chiedi in negozio.'}</dd></div>
            <div><dt>Allergeni dichiarati</dt><dd>{offer.allergens || 'Informazione non indicata dal venditore. Verifica in negozio prima del consumo.'}</dd></div>
            {offer.storage && <div><dt>Conservazione</dt><dd>{offer.storage}</dd></div>}
          </dl>
        </section>
      </div>
      <section className="panel detail-info">
        <div className="card-tags"><span>{category(offer.category)?.label}</span>{offer.shop.demo && <small>Offerta dimostrativa</small>}</div>
        <h1>{offer.title}</h1>
        <p className="detail-shop"><Store size={17} /> {offer.shop.name}</p>
        <p className="muted">{offer.shop.description}</p>
        <div className="pickup-box">
          <p><MapPin size={19} /><span><b>Ritiro in negozio</b><br />{offer.shop.address}, {offer.shop.city}</span></p>
          <p><Clock3 size={19} /><span><b>{slot(offer.starts, offer.ends)}</b><br />Ora italiana</span></p>
        </div>
        <p className="availability">{closed ? 'Fascia terminata' : offer.stock ? `${offer.stock} unità disponibili` : 'Offerta esaurita'}</p>
        {offer.donation ? <p className="notice">Disponibile per donazione. Segnalazione gestita dall’attività.</p> :
          <>
            <div className="prices detail-price"><strong>{euro(offer.price)}</strong><del>{euro(offer.original)}</del><span className="inline-discount">−{Math.round(100 - offer.price / offer.original * 100)}%</span></div>
            <p className="muted">Checkout dimostrativo. Nessun dato della carta e nessun addebito.</p>
            {buyable && (user?.role === 'customer' ? <Checkout key={id} id={id} price={offer.price} stock={offer.stock} /> :
              user ? <p className="notice">Per prenotare serve un account cliente.</p> :
              <Link href={`/accedi?next=${encodeURIComponent(href)}`} className="button primary full">Accedi per prenotare <ArrowRight size={17} /></Link>)}
          </>}
      </section>
    </div>
  </div>
}

function Donations({ user, state, now }: DemoView) {
  const offers = listings(state).filter(offer => offer.donation && offer.stock > 0 && available(offer, now))
    .sort((a, b) => a.starts.getTime() - b.starts.getTime())
  return <div className="container page">
    <div className="page-intro"><span className="step-icon"><HandHeart size={23} /></span><h1>Disponibili per donazione</h1><p>Le attività segnalano qui le eccedenze destinate alla donazione.</p></div>
    {offers.length ? <div className="cards">{offers.map(offer => <OfferCard key={offer.id} offer={offer} user={user} saved={false} />)}</div> :
      <Empty title="Nessuna eccedenza segnalata" href="/offerte" label="Esplora le offerte">Le nuove segnalazioni appariranno qui.</Empty>}
  </div>
}

function Favorites({ user, state }: DemoView) {
  const saved = new Set(state.favorites.filter(item => item.userId === user?.id).map(item => item.offerId))
  const items = listings(state).filter(offer => offer.active && !offer.donation && saved.has(offer.id))
  return <div className="container page">
    <div className="page-intro"><h1>Preferiti</h1><p>Le offerte che hai salvato.</p></div>
    {items.length ? <div className="cards">{items.map(offer => <OfferCard key={offer.id} offer={offer} user={user} saved />)}</div> :
      <Empty title="Nessun preferito" href="/offerte" label="Scopri le offerte">Tocca il cuore di un’offerta per salvarla.</Empty>}
  </div>
}

function OrderCard({ order }: { order: Order }) {
  const info = order.snapshot
  return <article className="panel order-card">
    <div className="split"><span className={'status ' + order.status}>{statusLabel[order.status]}</span><strong>{euro(order.total)}</strong></div>
    <h3><Link href={`/ordini/${order.id}`}>{info.title}</Link></h3>
    <p className="muted">{order.quantity} unità · {info.shop} · {info.city}</p>
    <div className="split"><span className="offer-time"><Clock3 size={16} />{slot(order.starts, order.ends)}</span><Link className="icon-link" href={`/ordini/${order.id}`} aria-label={`Riepilogo: ${info.title}`}><ArrowRight size={18} /></Link></div>
  </article>
}

function Orders({ user, state, id, now }: DemoView & { id?: string }) {
  const orders = state.orders.filter(order => order.userId === user?.id).map(order => withOrderStatus(order, now))
  if (id) {
    const order = orders.find(item => item.id === id)
    if (!order) return <Missing />
    const info = order.snapshot
    return <div className="container page narrow">
      <Back href="/ordini">Torna ai miei ordini</Back>
      <section className="panel summary">
        <span className="step-icon">{order.status === 'confirmed' ? <BadgeCheck size={25} /> : <Receipt size={25} />}</span>
        <div className="split"><h1>{order.status === 'confirmed' ? 'Prenotazione confermata' : 'Riepilogo ordine'}</h1><span className={'status ' + order.status}>{statusLabel[order.status]}</span></div>
        <h2>{info.title}</h2><p>{info.description}</p>{info.demo && <p className="muted">Offerta dimostrativa</p>}
        <div className="pickup-box"><p><MapPin size={20} /><span><b>{info.shop}</b><br />{info.address}, {info.city}</span></p><p><CalendarClock size={20} /><span><b>{slot(order.starts, order.ends)}</b><br />Ora italiana</span></p></div>
        {order.status === 'confirmed' && <div className="pickup-code"><span>Mostra questo codice al ritiro</span><code>{order.code}</code></div>}
        <dl className="details-list"><div><dt>Ingredienti</dt><dd>{info.ingredients || 'Non indicati dal venditore.'}</dd></div><div><dt>Allergeni dichiarati</dt><dd>{info.allergens || 'Informazione non indicata dal venditore. Verifica in negozio.'}</dd></div>{info.storage && <div><dt>Conservazione</dt><dd>{info.storage}</dd></div>}</dl>
        <div className="split totals"><span>{order.quantity} × {euro(order.unit)}</span><strong>Totale simulato {euro(order.total)}</strong></div>
        {order.status === 'collected' && <p className="notice">Hai risparmiato {euro(order.original * order.quantity - order.total)}.</p>}
        {order.status === 'confirmed' && order.starts > now && <ActionForm action="cancel" className="stack"><input type="hidden" name="id" value={id} /><button className="button outline danger">Annulla ordine</button><small>Puoi annullare prima dell’inizio della fascia.</small></ActionForm>}
      </section>
    </div>
  }
  const active = orders.filter(order => order.status === 'confirmed')
  const history = orders.filter(order => order.status !== 'confirmed')
  const collected = history.filter(order => order.status === 'collected')
  const saved = collected.reduce((sum, order) => sum + order.original * order.quantity - order.total, 0)
  return <div className="container page">
    <div className="page-intro"><h1>I miei ordini</h1><p>Controlla le prenotazioni e ritrova i tuoi codici di ritiro.</p></div>
    <div className="stats customer-stats"><Stat icon={Wallet} label="Risparmio sui ritiri" value={euro(saved)} /><Stat icon={Package} label="Unità ritirate" value={collected.reduce((sum, order) => sum + order.quantity, 0)} /></div>
    <section className="dashboard-section"><h2>Ordini attivi</h2>{active.length ? <div className="cards">{active.map(order => <OrderCard key={order.id} order={order} />)}</div> :
      <Empty title="Nessun ordine attivo" href="/offerte" label="Scopri le offerte">Qui troverai le prenotazioni da ritirare.</Empty>}</section>
    <section className="dashboard-section"><h2>Storico</h2>{history.length ? <div className="cards">{history.map(order => <OrderCard key={order.id} order={order} />)}</div> : <p className="muted">Lo storico è ancora vuoto.</p>}</section>
  </div>
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string | number }) {
  return <div className="panel stat"><span className="step-icon"><Icon size={20} /></span><div><span>{label}</span><strong>{value}</strong></div></div>
}

function Seller({ user, sub, id, state, now }: DemoView & { sub?: string; id?: string }) {
  const shop = user?.shop
  if (!shop) return <Access user={user} role="seller" />
  if (sub === 'attivita') return <div className="container page narrow">
    <Back href="/venditore">Torna alla dashboard</Back><section className="panel summary"><h1>La mia attività</h1>
      <ActionForm action="shop" className="stack"><ShopInputs shop={shop} /><button className="button primary">Salva attività <ArrowRight size={17} /></button></ActionForm>
    </section></div>
  if (sub === 'nuova' || (sub === 'offerta' && id)) {
    const offer = id ? state.offers.find(item => item.shopId === shop.id && item.id === id) : undefined
    if (id && !offer) return <Missing />
    return <div className="container page narrow">
      <Back href="/venditore">Torna alla dashboard</Back><section className="panel summary"><h1>{offer ? 'Modifica offerta' : 'Nuova offerta'}</h1><p className="muted">Indica cosa contiene l’offerta e quando si può ritirare.</p>
        <OfferForm
          offer={offer ? { ...offer, version: offer.updated.toISOString(), starts: local(offer.starts), ends: local(offer.ends) } : undefined}
          initialStart={local(new Date(Date.now() + 3600000))}
          initialEnd={local(new Date(Date.now() + 7200000))}
        />
      </section></div>
  }
  if (sub) return <Missing />
  const offers = state.offers.filter(offer => offer.shopId === shop.id).sort((a, b) => b.updated.getTime() - a.updated.getTime())
  const profileNames = new Map(state.profiles.map(profile => [profile.id, profile.name]))
  const orders = state.orders.filter(order => order.shopId === shop.id)
    .map(order => withOrderStatus(order, now)).sort((a, b) => a.starts.getTime() - b.starts.getTime())
  const active = offers.filter(offer => offer.active && offer.ends > now).length
  const preparing = orders.filter(order => order.status === 'confirmed')
  const sales = orders.filter(order => order.status !== 'canceled')
  const sum = (key: 'quantity' | 'total' | 'fee' | 'payout') => sales.reduce((total, order) => total + order[key], 0)
  const offerState = (offer: Offer) => !offer.active ? 'Disattivata' : offer.ends <= now ? 'Terminata' : offer.donation ? 'Donazione' : !offer.stock ? 'Esaurita' : 'Attiva'
  return <div className="container page">
    <div className="section-heading dashboard-heading">
      <div className="page-intro"><h1>Dashboard venditore</h1><p>{shop.name} · {shop.city}{shop.demo ? ' · Attività dimostrativa' : ''}</p></div>
      <div className="hero-actions"><Link className="button outline" href="/venditore/attivita"><Store size={17} /> La mia attività</Link><Link className="button primary" href="/venditore/nuova"><Plus size={19} /> Nuova offerta</Link></div>
    </div>
    <div className="stats">
      <Stat icon={Package} label="Offerte attive" value={active} /><Stat icon={Clock3} label="Ordini da preparare" value={preparing.length} />
      <Stat icon={ShoppingBag} label="Unità vendute" value={sum('quantity')} /><Stat icon={Receipt} label="Vendite simulate" value={euro(sum('total'))} />
      <Stat icon={Wallet} label="Commissioni GreenPlate" value={euro(sum('fee'))} /><Stat icon={Wallet} label="Quota venditore" value={euro(sum('payout'))} />
    </div>
    <div className="dashboard-section seller-pickups">
      <section className="panel"><h2>Verifica un codice</h2><p className="muted">Inserisci il codice mostrato dal cliente durante il ritiro.</p>
        <ActionForm action="collect" className="stack" reset><label>Codice di ritiro<input name="code" pattern="[A-Fa-f0-9]{16}" maxLength={16} autoComplete="off" required /></label><button className="button primary">Conferma ritiro <BadgeCheck size={18} /></button></ActionForm>
      </section>
      <section className="panel"><h2>Ritiri previsti</h2>{preparing.length ? <ul className="simple-list">{preparing.map(order => <li key={order.id}><b>{order.snapshot.title} · {order.quantity} pz</b><span>{profileNames.get(order.userId) ?? 'Cliente'} · {slot(order.starts, order.ends)}</span></li>)}</ul> : <p className="muted">Nessun ordine da preparare.</p>}</section>
    </div>
    <section className="dashboard-section">
      <h2>Le mie offerte</h2>
      {offers.length ? <div className="panel rows">
        {offers.map(offer => <div className="data-row" key={offer.id}>
          <div><strong>{offer.title}</strong><p>{euro(offer.price)} · {offer.stock} rimaste · {slot(offer.starts, offer.ends)}</p></div>
          <span className="status">{offerState(offer)}</span>
          <Link href={`/venditore/offerta/${offer.id}`} className="button outline small">Modifica</Link>
          <ActionForm action="toggle"><input type="hidden" name="id" value={offer.id} /><input type="hidden" name="active" value={offer.active ? 'no' : 'yes'} /><button className="button outline small">{offer.active ? 'Disattiva' : 'Riattiva'}</button></ActionForm>
        </div>)}
      </div> : <Empty title="Nessuna offerta pubblicata" href="/venditore/nuova" label="Crea la prima offerta">Le offerte che pubblichi appariranno qui.</Empty>}
    </section>
    <section className="dashboard-section"><h2>Registro ordini</h2>
      {orders.length ? <div className="panel rows">{orders.map(order => <div className="data-row order-row" key={order.id}><div><strong>{order.snapshot.title} · {order.quantity} pz</strong><p>{profileNames.get(order.userId) ?? 'Cliente'} · {slot(order.starts, order.ends)}</p></div><span className={'status ' + order.status}>{statusLabel[order.status]}</span><strong>{euro(order.total)}</strong></div>)}</div> : <p className="muted">Non hai ancora ricevuto ordini.</p>}
    </section>
  </div>
}

function Access({ user, role }: { user: Viewer; role: string }) {
  return <div className="container page narrow"><Empty title={user ? 'Area riservata' : 'Accedi per continuare'}
    href={user ? '/offerte' : '/accedi'} label={user ? 'Esplora le offerte' : 'Accedi'}>
    {role === 'seller' ? 'Quest’area è riservata ai venditori.' : 'Quest’area è riservata ai clienti.'}
  </Empty></div>
}

function Account({ register, params, user }: { register: boolean; params: SearchParams; user: Viewer }) {
  const next = first(params.next)
  const seller = first(params.ruolo) === 'venditore'
  const alternate = (register ? '/accedi' : '/registrati') + (next ? `?next=${encodeURIComponent(next)}` : '')
  return <div className="container page account-container">
    {user ? <Empty title={`Ciao, ${user.name}`} href={user.role === 'seller' ? '/venditore' : '/ordini'} label="Vai alla tua area">Hai già effettuato l’accesso.</Empty> :
      <section className="panel summary account"><span className="step-icon">{seller ? <Store size={23} /> : <ShoppingBag size={23} />}</span>
        <h1>{register ? (seller ? 'Registrati come venditore' : 'Crea un account') : 'Accedi a GreenPlate'}</h1>
        <p className="muted">{register ? 'Scegli il tuo ruolo e usa solo dati inventati.' : 'Entra con un profilo demo per esplorare offerte e ordini.'}</p>
        {!register && <DemoAccess next={next} />}
        <AccountForm register={register} seller={seller} next={next} />
        <p className="alternate">{register ? 'Hai già un account?' : 'Prima volta su GreenPlate?'} <Link href={alternate}>{register ? 'Accedi' : 'Registrati'}</Link></p>
      </section>}
  </div>
}

function Missing() {
  return <div className="container page narrow"><Empty title="Pagina non trovata" href="/offerte" label="Vai alle offerte">
    L’indirizzo potrebbe essere cambiato o appartenere a un altro browser.
  </Empty></div>
}

export default function GreenPlate({ route, search }: { route: string[]; search: SearchParams }) {
  const { state, persistent, now } = useDemo()
  const [page = '', sub, id] = route
  if (!state || !now) {
    return <main className="container page"><div className="panel"><p role="status">Caricamento di GreenPlate…</p>
      <noscript>Attiva JavaScript per usare la demo interattiva.</noscript>
    </div></main>
  }
  const profile = currentProfile(state)
  const user: Viewer = profile ? { ...profile, shop: state.shops.find(shop => shop.ownerId === profile.id) ?? null } : null
  const view = { state, user, now }
  let content: React.ReactNode
  if (!page || (page === 'offerte' && !sub)) content = <Catalog params={search} {...view} home={!page} />
  else if (page === 'offerte' && sub && !id) content = <Detail id={sub} {...view} />
  else if (page === 'donazioni' && !sub) content = <Donations {...view} />
  else if ((page === 'accedi' || page === 'registrati') && !sub) content = <Account register={page === 'registrati'} params={search} user={user} />
  else if (page === 'preferiti' && !sub) content = user?.role === 'customer' ? <Favorites {...view} /> : <Access user={user} role="customer" />
  else if (page === 'ordini' && !id) content = user?.role === 'customer' ? <Orders {...view} id={sub} /> : <Access user={user} role="customer" />
  else if (page === 'venditore' && route.length <= 3 && (!id || sub === 'offerta')) content = user?.role === 'seller' ? <Seller {...view} sub={sub} id={id} /> : <Access user={user} role="seller" />
  else content = <Missing />
  return <><a href="#contenuto" className="skip">Salta al contenuto</a><Header user={user} route={page} />
    <p className="demo-banner">Modalità demo · Dati di prova salvati in questo browser</p>
    {!persistent && <div className="container"><p className="notice notice-error" role="status">Il browser blocca il salvataggio. Le modifiche si perdono alla ricarica.</p></div>}
    <main id="contenuto">{content}</main><Footer /></>
}
