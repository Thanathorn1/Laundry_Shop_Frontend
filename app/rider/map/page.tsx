'use client'

import dynamic from 'next/dynamic'

const RiderMap = dynamic(
  () => import('@/components/RiderMapClient'),
  { ssr: false }
)

export default function Page() {
  return <RiderMap /> 
}
