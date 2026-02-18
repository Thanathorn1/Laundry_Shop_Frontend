"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'user' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/register', form);
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data._id);

            // Set cookies for Next.js Middleware
            document.cookie = `token=${data.token}; path=/; max-age=2592000`;
            document.cookie = `userRole=${data.role}; path=/; max-age=2592000`;
            document.cookie = `riderStatus=${data.riderStatus || 'approved'}; path=/; max-age=2592000`;

            if (data.role === 'admin') router.push('/admin');
            else if (data.role === 'rider') {
                alert('สมัครสมาชิกสำเร็จ! กรุณารอเจ้าหน้าที่ตรวจสอบและอนุมัติบัญชีของคุณ');
                router.push('/login');
            } else router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'customer', label: '👤 Customer', desc: 'Order laundry services' },
        { value: 'rider', label: '🛵 Rider', desc: 'Deliver orders' },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center py-20 relative overflow-hidden">
            <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-sky-200 rounded-full blur-3xl opacity-30"></div>

            <div className="relative w-full max-w-md mx-4">
                <div className="bg-white rounded-3xl shadow-blue-lg p-8 border border-blue-50">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 gradient-blue rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-blue-md">✨</div>
                        <h1 className="text-2xl font-black text-gray-800">Create Account</h1>
                        <p className="text-gray-500 mt-1">Join LaundryPro today — it's free!</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-6 text-sm flex items-center space-x-2">
                            <span>⚠️</span><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                            <input name="name" type="text" required value={form.name} onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                                placeholder="John Doe" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                            <input name="email" type="email" required value={form.email} onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                                placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                            <input name="phone" type="tel" required value={form.phone} onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                                placeholder="08X-XXX-XXXX" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                                placeholder="Min 6 characters" />
                        </div>

                        {/* Role selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                {roles.map(r => (
                                    <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value ? 'border-primary bg-primary-pale' : 'border-gray-200 hover:border-blue-300'}`}>
                                        <div className="font-semibold text-sm text-gray-800">{r.label}</div>
                                        <div className="text-xs text-gray-500">{r.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full btn-primary py-3 text-base disabled:opacity-60 mt-2">
                            {loading ? '⏳ Creating...' : 'Create Account →'}
                        </button>
                    </form>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
