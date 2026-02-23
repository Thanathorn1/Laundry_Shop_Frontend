'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { apiFetch } from '@/lib/api'

const RiderMapClient = dynamic(
  () => import('@/components/RiderMapClient'),
  { ssr: false }
)

export default function Page() {
  const [orders, setOrders] = useState([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await apiFetch('/rider/available')
        setOrders(data)
      } catch (err) {
        console.error("Failed to fetch orders:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (err) => console.error("Geolocation error:", err)
      )
    }
  }, [])

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await apiFetch(`/rider/accept/${orderId}`, { method: 'PATCH' });
      alert('Order accepted successfully!');
      // Refresh orders
      const data = await apiFetch('/rider/available')
      setOrders(data)
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full">
      <RiderMapClient
        orders={orders}
        userLocation={userLocation}
        onAcceptOrder={handleAcceptOrder}
      />
    </div>
  )
}
