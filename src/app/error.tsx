'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="container page"><div className="panel"><h1>Si è verificato un problema</h1><p>Riprova tra poco.</p><button className="button primary" onClick={reset}>Riprova</button></div></main>
}
