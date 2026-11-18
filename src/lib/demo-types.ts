export type Role = 'customer' | 'seller'
export type Profile = { id: string; name: string; email: string; role: Role }
export type Shop = {
  id: string; ownerId: string; name: string; kind: string; address: string; city: string; description: string; demo: boolean
}
export type Offer = {
  id: string; shopId: string; title: string; description: string; category: string; image: string;
  original: number; price: number; stock: number; ingredients: string; allergens: string; storage: string;
  starts: Date; ends: Date; updated: Date; active: boolean; donation: boolean
}
export type Snapshot = {
  title: string; shop: string; address: string; city: string; description: string; ingredients: string;
  allergens: string; storage: string; demo: boolean
}
export type Order = {
  id: string; userId: string; offerId: string; shopId: string; quantity: number; unit: number; original: number;
  total: number; fee: number; payout: number; status: 'confirmed' | 'collected' | 'canceled' | 'missed';
  code: string; snapshot: Snapshot; starts: Date; ends: Date; created: Date
}
export type DemoState = {
  version: 1; userId: string | null; profiles: Profile[]; shops: Shop[]; offers: Offer[]; orders: Order[];
  favorites: { userId: string; offerId: string }[]
}
