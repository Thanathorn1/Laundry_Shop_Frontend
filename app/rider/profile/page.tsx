"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, apiUpload, API_BASE_URL } from '@/lib/api';

interface RiderProfile {
    firstName: string;
    lastName: string;
    licensePlate: string;
    drivingLicense: string;
    phone: string;
    address: string;
    riderImageUrl?: string;
    vehicleImageUrl?: string;
    isApproved: boolean;
}

export default function RiderProfile() {
    const [profile, setProfile] = useState<RiderProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const emptyProfile: RiderProfile = {
        firstName: '',
        lastName: '',
        licensePlate: '',
        drivingLicense: '',
        phone: '',
        address: '',
        isApproved: false,
        riderImageUrl: '',
        vehicleImageUrl: '',
    };

    const normalizeProfile = (input: unknown): RiderProfile => {
        const source = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};
        return {
            firstName: typeof source.firstName === 'string' ? source.firstName : '',
            lastName: typeof source.lastName === 'string' ? source.lastName : '',
            licensePlate: typeof source.licensePlate === 'string' ? source.licensePlate : '',
            drivingLicense: typeof source.drivingLicense === 'string' ? source.drivingLicense : '',
            phone: typeof source.phone === 'string' ? source.phone : '',
            address: typeof source.address === 'string' ? source.address : '',
            riderImageUrl: typeof source.riderImageUrl === 'string' ? source.riderImageUrl : '',
            vehicleImageUrl: typeof source.vehicleImageUrl === 'string' ? source.vehicleImageUrl : '',
            isApproved: Boolean(source.isApproved),
        };
    };

    const isMissingProfileError = (message: string) => {
        const m = (message || '').toLowerCase();
        return (
            m.includes('not found') ||
            m.includes('โปรไฟล์') ||
            m.includes('ยังไม่ได้') ||
            m.includes('ไม่มี')
        );
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/rider/profile');
            setProfile(normalizeProfile(data));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);

            // New rider might not have a profile yet: allow creating one
            if (isMissingProfileError(message)) {
                setError(null);
                setProfile(emptyProfile);
                return;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!profile) return;

        try {
            setIsUpdating(true);
            const formData = new FormData();
            formData.append('firstName', profile.firstName);
            formData.append('lastName', profile.lastName);
            formData.append('licensePlate', profile.licensePlate);
            formData.append('drivingLicense', profile.drivingLicense);
            formData.append('phone', profile.phone);
            formData.append('address', profile.address);

            // Handle file inputs separately if needed, but here we just send the text data
            // For images, we provide separate upload buttons or handle them in the same PATCH
            await apiUpload('/rider/profile', formData);
            alert('Profile updated successfully');
            window.dispatchEvent(new Event('profile:updated'));
            fetchProfile();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append(field, file);
            // We also need to send the rest of the profile data as the backend expect the whole DTO
            if (profile) {
                formData.append('firstName', profile.firstName);
                formData.append('lastName', profile.lastName);
                formData.append('licensePlate', profile.licensePlate);
                formData.append('drivingLicense', profile.drivingLicense);
                formData.append('phone', profile.phone);
                formData.append('address', profile.address);
            }

            await apiUpload('/rider/profile', formData);
            alert('Image uploaded successfully');
            window.dispatchEvent(new Event('profile:updated'));
            fetchProfile();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">กำลังโหลดโปรไฟล์ของคุณ...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-rose-100/50 border border-rose-50 text-center">
            <div className="h-20 w-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">⚠️</div>
            <h2 className="text-2xl font-black text-blue-900 mb-4 tracking-tight">ไม่ได้รับอนุญาต</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                ขออภัย บัญชีของคุณอาจไม่มีสิทธิ์เข้าถึงหน้านี้ หรือเซสชันหมดอายุแล้ว
                <br /><span className="text-rose-500 text-xs font-bold mt-2 block">Error: {error}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100"
                >
                    ลองใหม่อีกครั้ง
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }}
                    className="px-8 py-4 bg-slate-50 text-blue-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                >
                    กลับไปหน้าล็อกอิน
                </button>
            </div>
        </div>
    );

    if (!profile) return (
        <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-[2.5rem] shadow-2xl border border-blue-100 text-center">
            <h2 className="text-2xl font-black text-blue-900 mb-4 tracking-tight">ไม่พบโปรไฟล์</h2>
            <p className="text-slate-500 font-medium mb-8">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน</p>
            <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100"
            >
                กลับหน้าหลัก
            </button>
        </div>
    );

    const ASSET_BASE = API_BASE_URL.replace(/\/api\/?$/, '');
    const resolveImg = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${ASSET_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Rider Profile</h1>
                        <p className="text-slate-400 text-sm mt-1">Update your professional details and vehicle information.</p>
                    </div>
                    <Link href="/rider" className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-slate-50">
                        ← Back
                    </Link>
                </div>

                {/* Image uploads - responsive grid */}
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Rider Identity</label>
                        <div className="relative aspect-square max-w-[200px] w-full overflow-hidden rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 transition-all hover:border-blue-400 hover:bg-blue-50/30 group cursor-pointer">
                            {profile.riderImageUrl ? (
                                <img
                                    src={resolveImg(profile.riderImageUrl)}
                                    alt="Rider"
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-1">
                                    <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                                    <span className="text-xs font-medium">Upload photo</span>
                                </div>
                            )}
                            <input
                                type="file"
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) => handleImageUpload(e, 'riderImage')}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle Details</label>
                        <div className="relative aspect-square max-w-[200px] w-full overflow-hidden rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 transition-all hover:border-sky-400 hover:bg-sky-50/30 group cursor-pointer">
                            {profile.vehicleImageUrl ? (
                                <img
                                    src={resolveImg(profile.vehicleImageUrl)}
                                    alt="Vehicle"
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-1">
                                    <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-9.25c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-2.25h.008v.008h-.008V2.25zm0 0A2.25 2.25 0 0113.5 4.5h-3A2.25 2.25 0 018.25 2.25zm0 0V.75" /></svg>
                                    <span className="text-xs font-medium">Upload photo</span>
                                </div>
                            )}
                            <input
                                type="file"
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) => handleImageUpload(e, 'vehicleImage')}
                            />
                        </div>
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">First Name</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="John"
                                value={profile.firstName}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Name</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="Doe"
                                value={profile.lastName}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone Number</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="08X-XXX-XXXX"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">License Plate</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="ABC-1234"
                                value={profile.licensePlate}
                                onChange={(e) => setProfile({ ...profile, licensePlate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Driving License Number</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            value={profile.drivingLicense}
                            onChange={(e) => setProfile({ ...profile, drivingLicense: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Home Address</label>
                        <textarea
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            rows={3}
                            value={profile.address}
                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${profile.isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {profile.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full mt-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isUpdating ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
