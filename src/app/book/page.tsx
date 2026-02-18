"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function BookMachinePage() {
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = useState('10:00');

    useEffect(() => {
        const fetchShops = async () => {
            const { data } = await api.get('/shops');
            setShops(data);
        };
        fetchShops();
    }, []);

    const handleBook = async (machineId: string) => {
        try {
            const startTime = new Date(`${bookingDate}T${bookingTime}:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour booking

            await api.post('/orders/book', {
                shopId: selectedShop._id,
                machineId,
                startTime,
                endTime
            });
            alert('Booking Confirmed!');
        } catch (err) {
            console.error(err);
            alert('Booking failed or slot unavailable');
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Book a Machine</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="space-y-4">
                    <label className="block text-sm font-bold">1. Select Branch</label>
                    <select
                        className="w-full p-2 border rounded"
                        onChange={(e) => setSelectedShop(shops.find((s: any) => s._id === e.target.value))}
                    >
                        <option value="">-- Choose Branch --</option>
                        {shops.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    <label className="block text-sm font-bold">2. Date</label>
                    <input type="date" className="w-full p-2 border rounded" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                </div>
                <div className="space-y-4">
                    <label className="block text-sm font-bold">3. Time</label>
                    <input type="time" className="w-full p-2 border rounded" value={bookingTime} onChange={e => setBookingTime(e.target.value)} />
                </div>
            </div>

            {selectedShop && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedShop.machines.map((m: any) => (
                        <div key={m.id} className="p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition">
                            <p className="font-bold text-lg mb-1">{m.type.toUpperCase()}</p>
                            <p className="text-xs text-gray-500 mb-4">ID: {m.id}</p>
                            <button
                                disabled={m.status !== 'available'}
                                onClick={() => handleBook(m.id)}
                                className={`w-full py-2 rounded font-bold text-sm ${m.status === 'available' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                {m.status === 'available' ? 'Book Now' : 'Busy'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
