import { Sprout } from 'lucide-react'

export function BrandMark({ size = 24 }: { size?: number }) {
  return <span className="brand-icon" aria-hidden="true"><Sprout size={size} strokeWidth={2.4} /></span>
}

export function Startup() {
  return <div className="startup" aria-hidden="true">
    <div className="startup-content">
      <BrandMark size={42} />
      <span className="startup-name">Green<span>Plate</span></span>
      <span className="startup-track"><span /></span>
    </div>
  </div>
}
