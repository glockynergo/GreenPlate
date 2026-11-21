import type { Metadata } from 'next'
import './styles.css'
import { themeBootstrap } from '@/lib/theme'
import { DemoProvider } from './demo-provider'
import { Startup } from './branding'

export const metadata: Metadata = {
  title: 'GreenPlate · Salva il cibo, risparmia ogni giorno',
  description: 'Scopri le offerte di negozi e locali, prenota e ritira in negozio.',
}
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body><Startup /><DemoProvider>{children}</DemoProvider></body>
  </html>
}
