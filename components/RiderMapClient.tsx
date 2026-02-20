'use client'

import { useEffect, useRef, useState } from 'react'

type LeafletMarker = {
    addTo: (map: LeafletMap) => LeafletMarker
    bindPopup: (content: string) => LeafletMarker
    remove: () => void
}

type LeafletMap = {
    setView: (center: [number, number], zoom: number) => void
    remove: () => void
}

type LeafletLib = {
    map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap
    tileLayer: (url: string, options: { maxZoom: number; attribution?: string }) => { addTo: (map: LeafletMap) => void }
    marker: (latLng: [number, number]) => LeafletMarker
}

async function loadLeaflet() {
    if (typeof window === 'undefined') return null
    const w = window as unknown as { L?: LeafletLib }
    if (w.L) return w.L

    if (!document.querySelector('link[data-leaflet="true"]')) {
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        css.setAttribute('data-leaflet', 'true')
        document.head.appendChild(css)
    }

    await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null
        if (existing) {
            if ((window as any).L) {
                resolve()
                return
            }
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () => reject(new Error('Failed to load leaflet')))
            return
        }

        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.async = true
        script.setAttribute('data-leaflet', 'true')
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load leaflet'))
        document.body.appendChild(script)
    })

    return (window as unknown as { L?: LeafletLib }).L ?? null
}

export default function RiderMapClient() {
    const [orders, setOrders] = useState<any[]>([])
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const leafletRef = useRef<LeafletLib | null>(null)
    const markersRef = useRef<LeafletMarker[]>([])

    useEffect(() => {
        fetch('http://localhost:3000/orders/rider/map', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
            .then(res => res.json())
            .then(data => {
                // 🔥 แก้ปัญหา orders.map is not a function
                if (Array.isArray(data)) {
                    setOrders(data)
                } else if (data.data) {
                    setOrders(data.data)
                }
            })
    }, [])

    useEffect(() => {
        let mounted = true

        const setupMap = async () => {
            const L = await loadLeaflet()
            if (!mounted || !L || !mapContainerRef.current || mapRef.current) return

            leafletRef.current = L
            const map = L.map(mapContainerRef.current, {
                center: [18.7883, 98.9853],
                zoom: 13,
            })

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors',
            }).addTo(map)

            mapRef.current = map
        }

        setupMap()

        return () => {
            mounted = false
            markersRef.current.forEach((marker) => marker.remove())
            markersRef.current = []
            if (mapRef.current) mapRef.current.remove()
            mapRef.current = null
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current
        const L = leafletRef.current
        if (!map || !L) return

        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        orders.forEach((order, index) => {
            const lat = order?.location?.lat ?? (18.7883 + (((index % 5) - 2) * 0.01))
            const lng = order?.location?.lng ?? order?.location?.lon ?? (98.9853 + ((Math.floor(index / 5) - 1) * 0.01))

            const marker = L.marker([lat, lng])
                .bindPopup(
                    `<div><b>Customer:</b> ${order?.user?.email || '-'}<br/><b>Status:</b> ${order?.status || '-'}${order?.weight ? `<br/><b>Weight:</b> ${order.weight} kg` : ''}</div>`,
                )
                .addTo(map)

            markersRef.current.push(marker)

            if (index === 0) {
                map.setView([lat, lng], 13)
            }
        })
    }, [orders])

    return (
        <div ref={mapContainerRef} className="h-screen w-full" />
    )
}
