import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'GreenPlate · Salva il cibo, risparmia ogni giorno',
  description: 'Scopri le offerte di negozi e locali, prenota e ritira in negozio.',
}
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>
}
