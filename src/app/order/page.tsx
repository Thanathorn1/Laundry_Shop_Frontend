"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const SERVICES = [
    { id: 'wash_dry', name: 'Wash & Dry', price: 40 },
    { id: 'dry_clean', name: 'Dry Clean', price: 100 },
    { id: 'iron', name: 'Ironing', price: 20 },
    { id: 'duvet', name: 'Duvet / Blanket', price: 120 },
];

export default function OrderPage() {
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState('');
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [weight, setWeight] = useState(1);
    const [urgent, setUrgent] = useState(false);
    const [total, setTotal] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const { data } = await api.get('/shops');
                setShops(data);
                if (data.length > 0) setSelectedShop(data[0]._id);
            } catch (err) {
                console.error(err);
            }
        };
        fetchShops();
    }, []);

    useEffect(() => {
        let price = selectedServices.reduce((acc, s) => acc + (s.price * weight), 0);
        if (urgent) price += 50;
        setTotal(price);
    }, [selectedServices, weight, urgent]);

    const toggleService = (service: any) => {
        if (selectedServices.find(s => s.id === service.id)) {
            setSelectedServices(selectedServices.filter(s => s.id !== service.id));
        } else {
            setSelectedServices([...selectedServices, service]);
        }
    };

    const handleCheckout = async () => {
        try {
            const { data } = await api.post('/orders', {
                shopId: selectedShop,
                services: selectedServices.map(s => ({ type: s.name, price: s.price * weight, weight })),
                totalPrice: total
            });
            window.location.href = data.url; // Redirect to Stripe
        } catch (err) {
            console.error(err);
            alert('Checkout failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-primary p-6 text-white text-center">
                    <h1 className="text-3xl font-bold">Create Laundry Order</h1>
                    <p className="mt-2 text-blue-100">Select your services and branch</p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Branch Selection */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Choose Branch</h2>
                        <select
                            value={selectedShop}
                            onChange={(e) => setSelectedShop(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-primary"
                        >
                            {shops.map((shop: any) => (
                                <option key={shop._id} value={shop._id}>{shop.name} - {shop.address}</option>
                            ))}
                            {shops.length === 0 && <option>No branches available</option>}
                        </select>
                    </section>

                    {/* Services Selection */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Select Services</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {SERVICES.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => toggleService(s)}
                                    className={`p-4 border rounded-xl text-left transition ${selectedServices.find(ss => ss.id === s.id)
                                        ? 'border-secondary bg-blue-50'
                                        : 'hover:border-gray-400'
                                        }`}
                                >
                                    <p className="font-bold text-gray-800">{s.name}</p>
                                    <p className="text-sm text-gray-600">{s.price} THB / kg</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Details */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Weight (kg)</h2>
                            <input
                                type="number"
                                min="1"
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                className="w-full p-3 border rounded-lg"
                            />
                        </div>
                        <div className="flex items-center space-x-3 mt-8">
                            <input
                                type="checkbox"
                                id="urgent"
                                checked={urgent}
                                onChange={(e) => setUrgent(e.target.checked)}
                                className="w-6 h-6 text-primary"
                            />
                            <label htmlFor="urgent" className="text-lg font-medium text-gray-800">Express Service (+50 THB)</label>
                        </div>
                    </section>

                    {/* Result Summary */}
                    <div className="mt-10 p-6 bg-gray-50 rounded-xl border-t-4 border-primary">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600">Total Price:</span>
                            <span className="text-3xl font-bold text-primary">{total} THB</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={selectedServices.length === 0}
                            className={`w-full py-4 text-white text-xl font-bold rounded-lg shadow-lg transition ${selectedServices.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-secondary'
                                }`}
                        >
                            Pay with Stripe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
