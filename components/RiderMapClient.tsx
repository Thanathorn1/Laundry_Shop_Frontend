'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// fix icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

export default function RiderMapClient() {
    const [orders, setOrders] = useState<any[]>([])

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

    return (
        <div className="h-screen">
            <MapContainer
                center={[18.7883, 98.9853]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution="© OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {orders.map(order => (
                    <Marker
                        key={order._id}
                        position={[order.location.lat, order.location.lng]}
                    >
                        <Popup>
                            <div>
                                <p><b>Customer:</b> {order.user?.email}</p>
                                <p><b>Weight:</b> {order.weight} kg</p>
                                <p><b>Status:</b> {order.status}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
