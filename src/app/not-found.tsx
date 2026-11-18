import Link from 'next/link'

export default function NotFound() {
  return <main className="container page"><div className="panel"><h1>Pagina non trovata</h1><p>L’indirizzo potrebbe essere cambiato.</p><Link className="button primary" href="/offerte">Vai alle offerte</Link></div></main>
}
