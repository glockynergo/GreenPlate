import GreenPlate from '../greenplate'
import type { SearchParams } from '../ui'

export default async function Page({ params, searchParams }: { params: Promise<{ route?: string[] }>; searchParams: Promise<SearchParams> }) {
  const [{ route = [] }, search] = await Promise.all([params, searchParams])
  return <GreenPlate route={route} search={search} />
}
