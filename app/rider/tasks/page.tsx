"use client";

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import LongdoMap from '@/components/LongdoMap';

interface Task {
    _id: string;
    customerName: string;
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    totalPrice: number;
}

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/rider/my-tasks');
            setTasks(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            await apiFetch(`/rider/status/${orderId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            fetchTasks();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const onMapLoad = (map: any) => {
        mapRef.current = map;
        tasks.forEach((task: Task) => {
            // Mocking location
            const mockLat = 13.7563 + (Math.random() - 0.5) * 0.05;
            const mockLon = 100.5018 + (Math.random() - 0.5) * 0.05;

            map.Overlays.add(new window.longdo.Marker({ lat: mockLat, lon: mockLon }, {
                title: task.customerName,
                detail: task.pickupAddress
            }));

            if (tasks.length === 1) {
                map.location({ lat: mockLat, lon: mockLon });
            }
        });
    };

    if (loading) return <div className="text-zinc-600 dark:text-zinc-400">Loading your tasks...</div>;
    if (error) return <div className="text-rose-600 dark:text-rose-400">Error: {error}</div>;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-black text-blue-900 tracking-tight">My Tasks</h1>
                <p className="text-blue-700/60 text-sm font-medium">Manage your active deliveries and update statuses.</p>
            </div>

            {tasks.length > 0 && (
                <div className="h-[350px] w-full overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl shadow-slate-200/50">
                    <LongdoMap id="tasks-map" callback={onMapLoad} />
                </div>
            )}

            {tasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-lg">You have no active tasks.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {tasks.map((task: Task) => (
                        <div key={task._id} className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-blue-900">{task.customerName}</h3>
                                    <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${task.status === 'delivered'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                        {task.status}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">Total Pay</span>
                                    <span className="text-2xl font-black text-blue-900 leading-none">฿{task.totalPrice}</span>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6 mb-8">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Pickup Address</span>
                                    <span className="text-sm font-bold text-blue-900">{task.pickupAddress}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                                    <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-2">Delivery Address</span>
                                    <span className="text-sm font-bold text-blue-900">{task.deliveryAddress}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-50 pt-6">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-2 block">Update Delivery Status</label>
                                    <select
                                        className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                                        value={task.status}
                                        onChange={(e) => updateStatus(task._id, e.target.value)}
                                    >
                                        <option value="accepted">Order Accepted</option>
                                        <option value="picked-up">Picked Up (Wash/Dry)</option>
                                        <option value="delivered">Delivered to Customer</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้?')) {
                                            updateStatus(task._id, 'cancelled');
                                        }
                                    }}
                                    className="sm:self-end rounded-xl bg-rose-50 px-6 py-3 text-sm font-black text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all"
                                >
                                    Cancel Task
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
