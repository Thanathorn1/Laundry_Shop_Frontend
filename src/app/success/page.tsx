"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        if (orderId) {
            const confirmPayment = async () => {
                try {
                    await api.put(`/orders/${orderId}/pay`);
                    setTimeout(() => router.push('/dashboard'), 3000);
                } catch (err) {
                    console.error(err);
                }
            };
            confirmPayment();
        }
    }, [orderId, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-green-50">
            <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-green-100">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Payment Successful!</h1>
                <p className="text-xl text-gray-600">Thank you for choosing Laundry Pro. We are preparing your order.</p>
                <p className="mt-4 text-green-600 font-medium">Redirecting to your dashboard...</p>
            </div>
        </div>
    );
}
