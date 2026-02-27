"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

type TabType = 'basic' | 'addresses' | 'security';

type CustomerProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  profileImage?: string;
};

type SavedAddress = {
  _id?: string;
  label: string;
  address: string;
  coordinates?: number[];
  isDefault?: boolean;
  contactPhone?: string;
  pickupType?: 'now' | 'schedule';
  pickupAt?: string | null;
};

type LatLng = { lat: number; lng: number };

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  on: (event: string, handler: () => void) => void;
  getLatLng: () => LatLng;
  setLatLng: (latLng: LatLng) => void;
  remove: () => void;
};

type LeafletMap = {
  on: (event: string, handler: (event: { latlng: LatLng }) => void) => void;
  panTo: (latLng: [number, number]) => void;
  remove: () => void;
  setView: (latLng: [number, number], zoom: number) => void;
};

type LeafletLib = {
  map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap;
  tileLayer: (url: string, options: { maxZoom: number }) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number], options: { draggable: boolean }) => LeafletMarker;
};

function getRoleFromAccessToken(token: string | null): 'user' | 'rider' | 'admin' | null {
  if (!token) return null;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded)) as { role?: string };

    if (parsed.role === 'admin' || parsed.role === 'rider' || parsed.role === 'user') {
      return parsed.role;
    }
    return null;
  } catch {
    return null;
  }
}

export default function CustomerSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);

  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formProfileImagePreview, setFormProfileImagePreview] = useState<string | null>(null);
  const [formProfileImageBase64, setFormProfileImageBase64] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState('13.7563');
  const [newLng, setNewLng] = useState('100.5018');
  const [newDefault, setNewDefault] = useState(false);

  // Edit address states
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editDefault, setEditDefault] = useState(false);
  const [isSavingEditAddress, setIsSavingEditAddress] = useState(false);
  const [deletingAddressIndex, setDeletingAddressIndex] = useState<number | null>(null);

  // Map refs
  const addMapContainerRef = useRef<HTMLDivElement | null>(null);
  const addMapInstanceRef = useRef<LeafletMap | null>(null);
  const addMarkerRef = useRef<LeafletMarker | null>(null);
  const editMapContainerRef = useRef<HTMLDivElement | null>(null);
  const editMapInstanceRef = useRef<LeafletMap | null>(null);
  const editMarkerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'basic' || tab === 'addresses' || tab === 'security') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const tokenRole = getRoleFromAccessToken(token);
    const authRole = localStorage.getItem('auth_role') || tokenRole;
    if (tokenRole && localStorage.getItem('auth_role') !== tokenRole) {
      localStorage.setItem('auth_role', tokenRole);
    }
    setIsAdminSession(authRole === 'admin');

    const load = async () => {
      try {
        setLoading(true);
        const [profileData, addressesData] = await Promise.all([
          apiFetch('/customers/me'),
          apiFetch('/customers/saved-addresses'),
        ]);

        const safeProfile = (profileData || {}) as CustomerProfile;
        setProfile(safeProfile);
        setFormFirstName((safeProfile.firstName || '').trim());
        setFormLastName((safeProfile.lastName || '').trim());
        setFormPhone((safeProfile.phoneNumber || '').trim());
        setFormAddress((safeProfile.address || '').trim());
        if (safeProfile.profileImage) {
          setFormProfileImagePreview(safeProfile.profileImage);
        }
        setSavedAddresses(Array.isArray(addressesData) ? addressesData : []);

        if ((safeProfile as any)?.role === 'admin') {
          setIsAdminSession(true);
          localStorage.setItem('auth_role', 'admin');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        if (message.includes('unauthorized')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('auth_role');
          router.replace('/');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setIsSavingProfile(true);
      const updated = await apiFetch('/customers/update', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          phoneNumber: formPhone.trim(),
          address: formAddress.trim() || undefined,
          ...(formProfileImageBase64 ? { profileImage: formProfileImageBase64 } : {}),
        }),
      });

      setProfile((updated || {}) as CustomerProfile);
      setSuccess('Profile updated successfully');
      window.dispatchEvent(new Event('profile:updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const submitNewAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const lat = Number(newLat);
    const lng = Number(newLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Latitude and longitude must be valid numbers');
      return;
    }

    try {
      setIsSavingAddress(true);
      await apiFetch('/customers/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: newLabel.trim() || 'Saved Place',
          address: newAddress.trim(),
          latitude: lat,
          longitude: lng,
          isDefault: newDefault,
          contactPhone: formPhone.trim() || undefined,
        }),
      });

      const refreshed = await apiFetch('/customers/saved-addresses');
      setSavedAddresses(Array.isArray(refreshed) ? refreshed : []);
      setNewLabel('Home');
      setNewAddress('');
      setNewLat('13.7563');
      setNewLng('100.5018');
      setNewDefault(false);
      setSuccess('Address added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Initialize add address map
  useEffect(() => {
    if (activeTab !== 'addresses' || !addMapContainerRef.current || addMapInstanceRef.current) return;

    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !addMapContainerRef.current) return;

      const lat = Number(newLat) || 13.7563;
      const lng = Number(newLng) || 100.5018;

      const map = (L as unknown as LeafletLib).map(addMapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
      });
      addMapInstanceRef.current = map;

      (L as unknown as LeafletLib).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = (L as unknown as LeafletLib).marker([lat, lng], { draggable: true }).addTo(map);
      addMarkerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setNewLat(String(pos.lat));
        setNewLng(String(pos.lng));
      });

      map.on('click', (e: { latlng: LatLng }) => {
        marker.setLatLng(e.latlng);
        setNewLat(String(e.latlng.lat));
        setNewLng(String(e.latlng.lng));
      });
    });

    return () => {
      cancelled = true;
      if (addMapInstanceRef.current) {
        addMapInstanceRef.current.remove();
        addMapInstanceRef.current = null;
        addMarkerRef.current = null;
      }
    };
  }, [activeTab]);

  // Update add marker when lat/lng changes externally
  useEffect(() => {
    if (!addMarkerRef.current || !addMapInstanceRef.current) return;
    const lat = Number(newLat);
    const lng = Number(newLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      addMarkerRef.current.setLatLng({ lat, lng });
      addMapInstanceRef.current.panTo([lat, lng]);
    }
  }, [newLat, newLng]);

  const useCurrentLocationForAdd = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLat(String(pos.coords.latitude));
        setNewLng(String(pos.coords.longitude));
      },
      () => alert('Cannot access location'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Start editing an address
  const startEditAddress = (index: number) => {
    const addr = savedAddresses[index];
    if (!addr) return;
    setEditingAddressIndex(index);
    setEditLabel(addr.label || '');
    setEditAddress(addr.address || '');
    const lat = Array.isArray(addr.coordinates) && addr.coordinates.length >= 2 ? addr.coordinates[1] : 13.7563;
    const lng = Array.isArray(addr.coordinates) && addr.coordinates.length >= 2 ? addr.coordinates[0] : 100.5018;
    setEditLat(String(lat));
    setEditLng(String(lng));
    setEditDefault(!!addr.isDefault);
  };

  const cancelEditAddress = () => {
    setEditingAddressIndex(null);
    if (editMapInstanceRef.current) {
      editMapInstanceRef.current.remove();
      editMapInstanceRef.current = null;
      editMarkerRef.current = null;
    }
  };

  // Initialize edit address map
  useEffect(() => {
    if (editingAddressIndex === null || !editMapContainerRef.current || editMapInstanceRef.current) return;

    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !editMapContainerRef.current) return;

      const lat = Number(editLat) || 13.7563;
      const lng = Number(editLng) || 100.5018;

      const map = (L as unknown as LeafletLib).map(editMapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
      });
      editMapInstanceRef.current = map;

      (L as unknown as LeafletLib).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = (L as unknown as LeafletLib).marker([lat, lng], { draggable: true }).addTo(map);
      editMarkerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setEditLat(String(pos.lat));
        setEditLng(String(pos.lng));
      });

      map.on('click', (e: { latlng: LatLng }) => {
        marker.setLatLng(e.latlng);
        setEditLat(String(e.latlng.lat));
        setEditLng(String(e.latlng.lng));
      });
    });

    return () => {
      cancelled = true;
      if (editMapInstanceRef.current) {
        editMapInstanceRef.current.remove();
        editMapInstanceRef.current = null;
        editMarkerRef.current = null;
      }
    };
  }, [editingAddressIndex]);

  const useCurrentLocationForEdit = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditLat(String(pos.coords.latitude));
        setEditLng(String(pos.coords.longitude));
        if (editMarkerRef.current && editMapInstanceRef.current) {
          editMarkerRef.current.setLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          editMapInstanceRef.current.panTo([pos.coords.latitude, pos.coords.longitude]);
        }
      },
      () => alert('Cannot access location'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submitEditAddress = async () => {
    if (editingAddressIndex === null) return;
    setError(null);
    setSuccess(null);

    const lat = Number(editLat);
    const lng = Number(editLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Invalid coordinates');
      return;
    }

    const addr = savedAddresses[editingAddressIndex];
    if (!addr?._id) {
      setError('Address ID not found');
      return;
    }

    try {
      setIsSavingEditAddress(true);
      await apiFetch(`/customers/addresses/${addr._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: editLabel.trim() || 'Saved Place',
          address: editAddress.trim(),
          latitude: lat,
          longitude: lng,
          isDefault: editDefault,
        }),
      });

      const refreshed = await apiFetch('/customers/saved-addresses');
      setSavedAddresses(Array.isArray(refreshed) ? refreshed : []);
      cancelEditAddress();
      setSuccess('Address updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setIsSavingEditAddress(false);
    }
  };

  const deleteAddress = async (index: number) => {
    const addr = savedAddresses[index];
    if (!addr?._id) {
      setError('Address ID not found');
      return;
    }

    try {
      setDeletingAddressIndex(index);
      await apiFetch(`/customers/addresses/${addr._id}`, { method: 'DELETE' });
      const refreshed = await apiFetch('/customers/saved-addresses');
      setSavedAddresses(Array.isArray(refreshed) ? refreshed : []);
      setSuccess('Address deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address');
    } finally {
      setDeletingAddressIndex(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-blue-900">
      <aside className="hidden md:block w-72 border-r border-blue-50 bg-white p-8 shadow-sm h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-black text-xl">C</span>
          </div>
          <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">Laundry Client</h2>
        </div>
        <nav className="space-y-1.5">
          <Link href="/customer" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
            <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🏠</span>
            Dashboard
          </Link>
          <Link href="/customer/create-order" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
            <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">➕</span>
            New Order
          </Link>
          <Link href="/customer/history" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
            <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">�️</span>
            History
          </Link>
          <Link href="/customer/settings" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold bg-blue-50 text-blue-700 shadow-sm transition-all border border-blue-100">
            <span className="mr-3 text-lg">⚙️</span>
            Settings
          </Link>

          {isAdminSession && (
            <>
              <div className="px-4 pt-4 text-[10px] font-black text-blue-300 uppercase tracking-widest">Admin</div>
              <Link href="/admin/customers?from=customer" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">👤</span>
                Customer List
              </Link>
              <Link href="/admin/riders?from=customer" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🛵</span>
                Rider List
              </Link>
              <Link href="/admin/admins?from=customer" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🛡️</span>
                Admin List
              </Link>
              <Link href="/admin/employees?from=customer" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🧑‍🔧</span>
                Employee List
              </Link>
              <Link href="/admin/pin-shop?from=customer" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">📍</span>
                Pin Shop
              </Link>
            </>
          )}

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all group"
            >
              <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🚪</span>
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8 pb-24 md:p-12 md:pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-blue-900">Profile Settings</h1>
          <p className="text-blue-700/60 text-lg font-medium mt-2">Manage your profile and saved addresses.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab('basic')}
            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${activeTab === 'basic' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-100 hover:bg-blue-50'}`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${activeTab === 'addresses' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-100 hover:bg-blue-50'}`}
          >
            Saved Addresses
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-100 hover:bg-blue-50'}`}
          >
            Security
          </button>
        </div>

        {error && <p className="mb-4 rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {success && <p className="mb-4 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">{success}</p>}

        {loading ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-10 shadow-sm">
            <p className="text-sm font-semibold text-blue-500">Loading settings...</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            {activeTab === 'basic' && (
              <form className="space-y-4" onSubmit={submitProfile}>
                {/* Profile Image */}
                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0">
                    {formProfileImagePreview ? (
                      <img src={formProfileImagePreview} alt="Profile" className="h-20 w-20 rounded-full object-cover border-2 border-blue-100 shadow" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-black text-white shadow">
                        {(formFirstName.charAt(0) || 'U').toUpperCase()}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white border border-slate-200 shadow hover:bg-blue-50">
                      <span className="text-sm">📷</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            setFormProfileImagePreview(result);
                            setFormProfileImageBase64(result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Profile Photo</p>
                    <p className="text-xs text-blue-700/60 mt-0.5">Click the camera icon to upload a new photo</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold">First Name</label>
                    <input
                      required
                      value={formFirstName}
                      onChange={(event) => setFormFirstName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold">Last Name</label>
                    <input
                      required
                      value={formLastName}
                      onChange={(event) => setFormLastName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold">Email</label>
                    <input
                      value={(profile?.email || '')}
                      disabled
                      className="w-full rounded-xl border border-zinc-200 bg-slate-50 px-3 py-2 text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold">Telephone Number</label>
                    <input
                      required
                      value={formPhone}
                      onChange={(event) => setFormPhone(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold">Address</label>
                  <textarea
                    value={formAddress}
                    onChange={(event) => setFormAddress(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-blue-900">Saved Addresses</h2>
                  <p className="text-sm font-medium text-blue-700/70">You can add addresses and use them in create order.</p>
                </div>

                {savedAddresses.length === 0 ? (
                  <p className="text-sm text-blue-700/60">No saved addresses yet.</p>
                ) : (
                  <div className="space-y-2">
                    {savedAddresses.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-200 p-3">
                        {editingAddressIndex === index ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                placeholder="Label"
                              />
                              <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                <input type="checkbox" checked={editDefault} onChange={(e) => setEditDefault(e.target.checked)} />
                                Set as default
                              </label>
                            </div>
                            <textarea
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              rows={2}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                              placeholder="Address"
                            />
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                              <div ref={editMapContainerRef} className="h-48 w-full" />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-blue-700/70">Drag marker or click map</p>
                              <button type="button" onClick={useCurrentLocationForEdit} className="text-xs font-bold text-emerald-600 hover:underline">
                                Use Current Location
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                value={editLat}
                                onChange={(e) => setEditLat(e.target.value)}
                                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="Latitude"
                              />
                              <input
                                value={editLng}
                                onChange={(e) => setEditLng(e.target.value)}
                                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="Longitude"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={cancelEditAddress}
                                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={submitEditAddress}
                                disabled={isSavingEditAddress}
                                className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {isSavingEditAddress ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-black text-blue-900">{item.label} {item.isDefault ? '(Default)' : ''}</p>
                              <p className="text-xs text-slate-600 mt-1">{item.address}</p>
                              {Array.isArray(item.coordinates) && item.coordinates.length >= 2 && (
                                <p className="text-[11px] text-slate-500 mt-1">Lat: {item.coordinates[1]}, Lng: {item.coordinates[0]}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEditAddress(index)}
                                className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddress(index)}
                                disabled={deletingAddressIndex === index}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                              >
                                {deletingAddressIndex === index ? '...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form className="space-y-3 rounded-xl border border-slate-200 p-4" onSubmit={submitNewAddress}>
                  <p className="text-sm font-black text-blue-900">Add New Address</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={newLabel}
                      onChange={(event) => setNewLabel(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                      placeholder="Label (Home, Office...)"
                    />
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <input type="checkbox" checked={newDefault} onChange={(event) => setNewDefault(event.target.checked)} />
                      Set as default
                    </label>
                  </div>

                  <textarea
                    value={newAddress}
                    onChange={(event) => setNewAddress(event.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                    placeholder="Address"
                    required
                  />

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div ref={addMapContainerRef} className="h-48 w-full" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-blue-700/70">Drag marker or click on map to set location</p>
                    <button type="button" onClick={useCurrentLocationForAdd} className="text-xs font-bold text-emerald-600 hover:underline">
                      Use Current Location
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={newLat}
                      onChange={(event) => setNewLat(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                      placeholder="Latitude"
                      required
                    />
                    <input
                      value={newLng}
                      onChange={(event) => setNewLng(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                      placeholder="Longitude"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSavingAddress ? 'Saving...' : 'Add Address'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-3">
                <h2 className="text-xl font-black text-blue-900">Security</h2>
                <p className="text-sm text-blue-700/70">To change password, use the forgot password flow.</p>
                <Link href="/reset-password" className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700">
                  Go to Reset Password
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-[1200] border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-2">
          <Link href="/customer" className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-bold text-blue-700/70">
            <span className="text-base">🏠</span>
            Dashboard
          </Link>
          <Link href="/customer/create-order" className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-bold text-blue-700/70">
            <span className="text-base">➕</span>
            New Order
          </Link>
          <Link href="/customer/history" className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-bold text-blue-700/70">
            <span className="text-base">�️</span>
            History
          </Link>
          <Link href="/customer/settings" className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-2 py-2 text-[11px] font-black text-blue-700">
            <span className="text-base">⚙️</span>
            Settings
          </Link>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-bold text-rose-500"
          >
            <span className="text-base">🚪</span>
            Logout
          </button>
        </div>
      </footer>
    </div>
  );
}
