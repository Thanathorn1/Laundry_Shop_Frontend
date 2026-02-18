"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data._id);

            if (data.role === 'admin') router.push('/admin');
            else if (data.role === 'rider') router.push('/rider');
            else router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 gradient-blue opacity-5"></div>
            <div className="absolute top-20 right-20 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-sky-200 rounded-full blur-3xl opacity-30"></div>

            <div className="relative w-full max-w-md mx-4">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-blue-lg p-8 border border-blue-50">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 gradient-blue rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-blue-md">
                            🫧
                        </div>
                        <h1 className="text-2xl font-black text-gray-800">Welcome Back</h1>
                        <p className="text-gray-500 mt-1">Sign in to your LaundryPro account</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-6 text-sm flex items-center space-x-2">
                            <span>⚠️</span><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:bg-white"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Signing in...' : 'Sign In →'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Don't have an account?{' '}
                            <Link href="/register" className="text-primary font-semibold hover:underline">Create one free</Link>
                        </p>
                    </div>

                    {/* Role hints */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-2xl">
                        <p className="text-xs text-gray-500 font-medium mb-2">Login redirects by role:</p>
                        <div className="flex flex-wrap gap-2">
                            <span className="badge-user text-xs">Customer → Dashboard</span>
                            <span className="badge-admin text-xs">Admin → Admin Panel</span>
                            <span className="badge-rider text-xs">Rider → Job Board</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
