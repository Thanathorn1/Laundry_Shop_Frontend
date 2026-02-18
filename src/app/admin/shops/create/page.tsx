"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CreateShopPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        openHours: '08:00 - 20:00',
        lat: '',
        lng: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('name', formData.name);
            data.append('address', formData.address);
            data.append('phone', formData.phone);
            data.append('openHours', formData.openHours);
            data.append('lat', formData.lat);
            data.append('lng', formData.lng);
            if (imageFile) data.append('image', imageFile);

            const res = await fetch(`${API_URL}/shops`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: data,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create shop');
            }

            setSuccess('Shop created successfully!');
            setTimeout(() => router.push('/admin/shops'), 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-600 p-8 text-white">
                    <h1 className="text-3xl font-bold">Create New Shop</h1>
                    <p className="mt-1 text-blue-200">Add a new laundry branch to the system</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Success / Error */}
                    {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>}
                    {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

                    {/* Shop Image Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Shop Image</label>
                        <div className="flex items-center gap-4">
                            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 text-xs text-center px-2">Click to upload image</span>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="shopImage"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="shopImage"
                                    className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                    Choose Image
                                </label>
                                <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP — Max 5MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Shop Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Laundry Pro - Sukhumvit Branch"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Address *</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Full address of the shop"
                            rows={2}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            required
                        />
                    </div>

                    {/* Phone & Hours */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="e.g. 02-123-4567"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Open Hours *</label>
                            <input
                                type="text"
                                value={formData.openHours}
                                onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                                placeholder="e.g. 08:00 - 20:00"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Map Coordinates */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Map Location (Latitude & Longitude) *
                        </label>
                        <p className="text-xs text-gray-400 mb-3">
                            💡 Get coordinates from{' '}
                            <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">
                                Google Maps
                            </a>{' '}
                            → Right-click on map → Copy coordinates
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lat}
                                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                    placeholder="e.g. 13.7563"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lng}
                                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                                    placeholder="e.g. 100.5018"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Mini Map Preview */}
                        {formData.lat && formData.lng && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                <iframe
                                    title="Map Preview"
                                    width="100%"
                                    height="220"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    src={`https://maps.google.com/maps?q=${formData.lat},${formData.lng}&z=15&output=embed`}
                                />
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-900 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {loading ? 'Creating Shop...' : '+ Create Shop'}
                    </button>
                </form>
            </div>
        </div>
    );
}
