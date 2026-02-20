"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import "leaflet/dist/leaflet.css";

// ปิด SSR สำหรับแผนที่ (กัน window undefined)
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);
const MapController = dynamic(
    () => import('react-leaflet').then((mod) => {
        const { useMap } = mod;
        return function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
            const map = useMap();
            useEffect(() => {
                map.setView(center, zoom);
            }, [center, zoom, map]);
            return null;
        };
    }),
    { ssr: false }
);

interface Task {
    _id: string;
    customerName: string;
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    totalPrice: number;
    pickupLocation?: {
        type: string;
        coordinates: [number, number]; // [lon, lat]
    };
}

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await apiFetch("/rider/my-tasks");
            setTasks(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            await apiFetch(`/rider/status/${orderId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
            });
            fetchTasks();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p>Loading...</p>
            </div>
        );

    if (error)
        return (
            <div className="text-center text-red-600 mt-10">
                Error: {error}
            </div>
        );

    const defaultCenter: [number, number] = [13.7563, 100.5018];

    return (
        <div className="p-8">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-black text-blue-900">
                        My Tasks
                    </h1>
                    <p className="text-sm text-blue-600">
                        Manage your active deliveries
                    </p>
                </div>

                {/* MAP */}
                {tasks.length > 0 && (
                    <div className="h-[400px] w-full rounded-3xl overflow-hidden border">
                        <MapContainer
                            center={defaultCenter}
                            zoom={13}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapController center={defaultCenter} zoom={13} />

                            {tasks.map((task) => {
                                const lat = task.pickupLocation?.coordinates?.[1];
                                const lon = task.pickupLocation?.coordinates?.[0];

                                if (!lat || !lon) return null;

                                return (
                                    <Marker key={task._id} position={[lat, lon]}>
                                        <Popup>
                                            <div className="p-1">
                                                <p className="font-bold text-blue-900">{task.customerName}</p>
                                                <p className="text-xs text-slate-500">{task.pickupAddress}</p>
                                                <p className="text-xs font-black text-emerald-600 mt-1">฿{task.totalPrice}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    </div>
                )}

                {/* TASK LIST */}
                {tasks.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border">
                        <p>You have no active tasks.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {tasks.map((task) => (
                            <div
                                key={task._id}
                                className="rounded-2xl border p-6 bg-white"
                            >
                                <h3 className="text-xl font-bold">
                                    {task.customerName}
                                </h3>
                                <p>Status: {task.status}</p>
                                <p>Pickup: {task.pickupAddress}</p>
                                <p>Delivery: {task.deliveryAddress}</p>
                                <p>Total: ฿{task.totalPrice}</p>

                                <select
                                    className="mt-3 border p-2 rounded"
                                    value={task.status}
                                    onChange={(e) =>
                                        updateStatus(task._id, e.target.value)
                                    }
                                >
                                    <option value="accepted">
                                        Order Accepted
                                    </option>
                                    <option value="picked-up">
                                        Picked Up
                                    </option>
                                    <option value="delivered">
                                        Delivered
                                    </option>
                                    <option value="cancelled">
                                        Cancelled
                                    </option>
                                </select>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}