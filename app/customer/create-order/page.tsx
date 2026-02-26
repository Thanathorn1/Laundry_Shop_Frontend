"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Box,
  Camera,
  CheckCircle,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Calendar,
  Cloudy,
  Wind,
  Thermometer,
  Waves,
  Zap,
  ShieldCheck,
  CreditCard,
  Sparkles,
  XCircle
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

type CreateOrderPayload = {
  productName: string;
  description?: string;
  images?: string[];
  contactPhone?: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress?: string;
  pickupType: 'now' | 'schedule';
  pickupAt?: string;
};

type CustomerProfile = {
  phoneNumber?: string;
};

type SavedAddress = {
  id?: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  contactPhone?: string;
  pickupType?: 'now' | 'schedule';
  pickupAt?: string | null;
};

import { loadLeaflet, LeafletLib, LeafletMap, LeafletMarker, LatLng } from "@/lib/leaflet-loader";

const DEFAULT_PICKUP = { lat: 13.7563, lng: 100.5018 };

// Local loader removed

const LAUNDRY_SERVICES = [
  {
    id: 'wash_fold',
    title: 'Wash & Fold',
    description: 'Everyday wear, expertly cleaned and neatly folded.',
    icon: Waves,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    priceEstimate: 'From ฿50/kg'
  },
  {
    id: 'dry_clean',
    title: 'Dry Clean',
    description: 'Delicate care for suits, silks, and formal wear.',
    icon: Wind,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    priceEstimate: 'From ฿120/pc'
  },
  {
    id: 'ironing',
    title: 'Ironing Only',
    description: 'Crisp, professional finish for your shirts and linens.',
    icon: Thermometer,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    priceEstimate: 'From ฿20/pc'
  },
  {
    id: 'express',
    title: 'Express Plus',
    description: 'Prioritized handling. Ready in under 12 hours.',
    icon: Zap,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    priceEstimate: '฿100 Surcharge'
  }
];

export default function CreateOrderPage() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const hasTriedAutoLocationRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [basketPhotos, setBasketPhotos] = useState<File[]>([]);
  const [basketPhotoPreviews, setBasketPhotoPreviews] = useState<string[]>([]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupType, setPickupType] = useState<'now' | 'schedule'>('now');
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [savePickup, setSavePickup] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Home");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [pickupLatitude, setPickupLatitude] = useState(String(DEFAULT_PICKUP.lat));
  const [pickupLongitude, setPickupLongitude] = useState(String(DEFAULT_PICKUP.lng));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || hasTriedAutoLocationRef.current) return;
    hasTriedAutoLocationRef.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLatitude(String(position.coords.latitude));
        setPickupLongitude(String(position.coords.longitude));
      },
      () => {
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [hasMounted]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        productName.trim() &&
        contactPhone.trim() &&
        pickupLatitude.trim() &&
        pickupLongitude.trim() &&
        !Number.isNaN(Number(pickupLatitude)) &&
        !Number.isNaN(Number(pickupLongitude)) &&
        (pickupType === 'now' || (pickupDate.trim() && pickupTime.trim())),
      ),
    [productName, contactPhone, pickupLatitude, pickupLongitude, pickupType, pickupDate, pickupTime],
  );

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = LAUNDRY_SERVICES.find(s => s.id === serviceId);
    if (service) {
      setProductName(service.title);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }

    const loadSavedAddresses = async () => {
      try {
        setIsLoadingSaved(true);
        const profile = await apiFetch('/customers/me');
        if (profile && typeof profile === 'object') {
          const phone = (profile as CustomerProfile).phoneNumber;
          if (typeof phone === 'string') {
            setContactPhone(phone);
          }
        }

        const data = await apiFetch("/customers/saved-addresses");
        const addressList = Array.isArray(data) ? data : (data?.addresses ?? []);
        setSavedAddresses(addressList as SavedAddress[]);
      } catch (savedError) {
        const message = savedError instanceof Error ? savedError.message : 'Failed to load saved addresses';
        if (message.toLowerCase().includes('unauthorized')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('auth_role');
          router.push('/');
          return;
        }
        if (message.toLowerCase().includes('customer profile not found')) {
          router.push('/customer/profile?returnTo=/customer/create-order');
          return;
        }
      } finally {
        setIsLoadingSaved(false);
      }
    };

    loadSavedAddresses();
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const setupMap = async () => {
      try {
        const L = await loadLeaflet();
        if (!mounted || !L || !mapContainerRef.current || mapInstanceRef.current) {
          return;
        }

        const initialLat = Number(pickupLatitude) || DEFAULT_PICKUP.lat;
        const initialLng = Number(pickupLongitude) || DEFAULT_PICKUP.lng;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 15,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

        marker.on("dragend", () => {
          const point = marker.getLatLng();
          setPickupLatitude(String(point.lat));
          setPickupLongitude(String(point.lng));
        });

        map.on("click", (event: { latlng: LatLng }) => {
          const point = event.latlng;
          marker.setLatLng(point);
          setPickupLatitude(String(point.lat));
          setPickupLongitude(String(point.lng));
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch {
        setError("Failed to load map");
      }
    };

    setupMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [pickupLatitude, pickupLongitude]);

  useEffect(() => {
    const lat = Number(pickupLatitude);
    const lng = Number(pickupLongitude);

    if (Number.isNaN(lat) || Number.isNaN(lng) || !markerRef.current || !mapInstanceRef.current) {
      return;
    }

    markerRef.current.setLatLng({ lat, lng });
    mapInstanceRef.current.panTo([lat, lng]);
  }, [pickupLatitude, pickupLongitude]);

  useEffect(() => {
    const urls = basketPhotos.map((file) => URL.createObjectURL(file));
    setBasketPhotoPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [basketPhotos]);

  const filesToBase64 = async (files: File[]) => {
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        }),
    );
    return Promise.all(readers);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLatitude(String(position.coords.latitude));
        setPickupLongitude(String(position.coords.longitude));
      },
      () => setError("Cannot access current location. Please allow location permission."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const pickupLat = Number(pickupLatitude);
    const pickupLng = Number(pickupLongitude);
    if (Number.isNaN(pickupLat) || Number.isNaN(pickupLng)) {
      setError("Pickup latitude/longitude must be numbers");
      return;
    }

    if (pickupType === 'schedule' && (!pickupDate.trim() || !pickupTime.trim())) {
      setError("Please select pickup date and time");
      return;
    }

    const pickupAt =
      pickupType === 'schedule'
        ? new Date(`${pickupDate}T${pickupTime}:00`).toISOString()
        : undefined;

    try {
      setIsLoading(true);

      const images = await filesToBase64(basketPhotos);

      const payload: any = {
        productName: productName.trim(),
        description: description.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        pickupAddress: pickupAddress.trim() || undefined,
        pickupType,
        pickupAt,
        images,
      };

      await apiFetch("/customers/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (savePickup && pickupAddress.trim()) {
        await apiFetch('/customers/addresses', {
          method: 'POST',
          body: JSON.stringify({
            label: saveLabel.trim() || 'Saved Place',
            address: pickupAddress.trim(),
            latitude: pickupLat,
            longitude: pickupLng,
            isDefault: false,
            contactPhone: contactPhone.trim() || undefined,
            pickupType,
            pickupAt: pickupAt || null,
          }),
        });

        const data = await apiFetch('/customers/saved-addresses');
        const updatedList = Array.isArray(data) ? data : (data?.addresses ?? []);
        setSavedAddresses(updatedList as SavedAddress[]);
      }

      setSuccess("Order created successfully");
      setProductName("");
      setDescription("");
      setBasketPhotos([]);
      setSavePickup(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Create order failed";
      if (message.toLowerCase().includes('unauthorized')) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('auth_role');
        router.push('/');
        return;
      }
      if (message.toLowerCase().includes('customer profile not found')) {
        router.push('/customer/profile?returnTo=/customer/create-order');
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasMounted) {
    return <div className="min-h-screen bg-slate-50 p-6 text-blue-900" />;
  }

  return (
    <div className="min-h-screen bg-grid-pattern pb-20 pt-8 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl animate-blur-in">
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="space-y-1">
            <Link
              href="/customer"
              className="group inline-flex items-center text-sm font-bold text-blue-500 hover:text-blue-700 transition-colors mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Create New <span className="text-blue-600">Order</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-lg italic">
              Experience the future of clean. Complete {currentStep}/4 steps.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 animate-pulse-glow">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <span className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest">Premium Care Active</span>
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="px-4 mb-12">
          <div className="relative flex justify-between">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />

            {/* Progress Line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0"
            />

            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                <motion.div
                  initial={false}
                  animate={{
                    scale: currentStep === step ? 1.2 : 1,
                    backgroundColor: currentStep >= step ? '#2563eb' : (currentStep < step ? '#f1f5f9' : '#ffffff'),
                    borderColor: currentStep >= step ? '#2563eb' : '#e2e8f0'
                  }}
                  className={`h-10 w-10 rounded-full border-2 flex items-center justify-center text-sm font-black transition-colors ${currentStep >= step ? 'text-white' : 'text-slate-400 dark:bg-slate-900'
                    }`}
                >
                  {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                </motion.div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep >= step ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                  {step === 1 ? 'Service' : step === 2 ? 'Details' : step === 3 ? 'Schedule' : 'Location'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4"
            >
              <div className="glass-card rounded-[3rem] p-10 border border-white/20 shadow-premium relative overflow-hidden">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Select Service</h2>
                <p className="text-slate-500 text-sm mb-10">Tailored care for every garment you own.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {LAUNDRY_SERVICES.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`group relative text-left p-8 rounded-[2.5rem] border-2 transition-all hover:shadow-premium active:scale-95 ${selectedServiceId === service.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-100 bg-white shadow-soft'
                        }`}
                    >
                      <div className={`h-14 w-14 rounded-2xl ${service.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <service.icon className={`h-7 w-7 ${service.color}`} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{service.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${service.color}`}>
                          {service.priceEstimate}
                        </span>
                        {selectedServiceId === service.id && (
                          <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-12 flex justify-end">
                  <button
                    disabled={!selectedServiceId}
                    onClick={() => setCurrentStep(2)}
                    className="group px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:shadow-premium transition-all active:scale-95 disabled:opacity-50"
                  >
                    Next Details <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4"
            >
              <div className="glass-card rounded-[3rem] p-10 border border-white/20 shadow-premium">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Garment Details</h2>
                <p className="text-slate-500 text-sm mb-10">Describe what you're sending so we can treat it with care.</p>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Custom Order Name</label>
                    <input
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full rounded-[2rem] border border-slate-100 bg-white px-8 py-5 text-sm font-bold placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-soft"
                      placeholder="e.g., Silk Shirt & Wool Trousers"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Visualization (Upload Photos)</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setBasketPhotos(Array.from(e.target.files ?? []))}
                        className="hidden"
                        id="basket-photos"
                      />
                      <label
                        htmlFor="basket-photos"
                        className="flex flex-col items-center justify-center w-full aspect-video md:aspect-auto md:h-48 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-400 cursor-pointer transition-all group"
                      >
                        <Camera className="h-10 w-10 text-slate-300 group-hover:text-blue-500 transition-colors mb-3" />
                        <span className="text-sm font-bold text-slate-500 group-hover:text-blue-700">Drop images or click to browse</span>
                        <span className="text-[10px] font-medium text-slate-400 mt-2 italic">Max 5MB per image. JPG, PNG supported.</span>
                        {basketPhotos.length > 0 && (
                          <div className="mt-4 px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                            {basketPhotos.length} Files Selected
                          </div>
                        )}
                      </label>
                    </div>

                    {basketPhotoPreviews.length > 0 && (
                      <div className="mt-6 grid grid-cols-5 gap-4">
                        {basketPhotoPreviews.map((url, i) => (
                          <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-soft relative group hover:scale-105 transition-transform">
                            <img src={url} alt="Preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Special Instructions</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-[2rem] border border-slate-100 bg-white px-8 py-5 text-sm font-bold placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-soft resize-none"
                      placeholder="e.g., Please treat the wine stain on the white collar carefully."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="mt-12 flex justify-between gap-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    disabled={!productName.trim()}
                    onClick={() => setCurrentStep(3)}
                    className="group px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:shadow-premium transition-all active:scale-95 disabled:opacity-50"
                  >
                    Pickup Time <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4"
            >
              <div className="glass-card rounded-[3rem] p-10 border border-white/20 shadow-premium">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Schedule & Contact</h2>
                <p className="text-slate-500 text-sm mb-10">When should our rider arrive at your doorstep?</p>

                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      type="button"
                      onClick={() => setPickupType('now')}
                      className={`flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all ${pickupType === 'now'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 shadow-premium'
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                    >
                      <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center ${pickupType === 'now' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Navigation className="h-7 w-7" />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Pickup Now</div>
                        <div className="text-xs font-bold text-slate-500">Under 30 Minutes</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPickupType('schedule')}
                      className={`flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all ${pickupType === 'schedule'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 shadow-premium'
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                    >
                      <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center ${pickupType === 'schedule' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Calendar className="h-7 w-7" />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Schedule</div>
                        <div className="text-xs font-bold text-slate-500">Pick a custom window</div>
                      </div>
                    </button>
                  </div>

                  {pickupType === 'schedule' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-6 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Date</label>
                        <input
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-4 text-sm font-bold bg-white dark:bg-slate-900 focus:border-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Time Window</label>
                        <input
                          type="time"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-4 text-sm font-bold bg-white dark:bg-slate-900 focus:border-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Contact Details</label>
                    <div className="relative group">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <input
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pl-16 pr-8 py-5 text-sm font-black placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all shadow-soft"
                        placeholder="08X XXX XXXX"
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-bold text-slate-400 italic px-4">Our rider will call this number upon arrival.</p>
                  </div>
                </div>

                <div className="mt-12 flex justify-between gap-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    disabled={!contactPhone.trim() || (pickupType === 'schedule' && (!pickupDate || !pickupTime))}
                    onClick={() => setCurrentStep(4)}
                    className="group px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:shadow-premium transition-all active:scale-95 disabled:opacity-50"
                  >
                    Final: Location <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4"
            >
              <div className="glass-card rounded-[3rem] p-10 border border-white/20 shadow-premium">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Final Confirmation</h2>
                <p className="text-slate-500 text-sm mb-10">Verify your location and complete your request.</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-soft relative z-0">
                      <div ref={mapContainerRef} className="h-64 sm:h-80 w-full" />
                      <div className="absolute top-4 left-4 z-10">
                        <div className="glass-frost px-4 py-2 rounded-full text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-premium border border-white/20">
                          Exact Pickup Point
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        className="absolute bottom-4 right-4 z-10 p-4 rounded-2xl bg-white text-blue-600 shadow-premium hover:scale-110 active:scale-95 transition-all border border-slate-100"
                        title="Use My Location"
                      >
                        <Navigation className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Detailed Address / Note</label>
                      <input
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        className="w-full rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-soft"
                        placeholder="e.g. Lobby, Building A, 2nd Floor"
                      />

                      <div className="flex items-center gap-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                        <label className="flex flex-1 items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={savePickup}
                            onChange={(e) => setSavePickup(e.target.checked)}
                            className="h-6 w-6 rounded-xl border-slate-300 accent-blue-600 transition-all"
                          />
                          <span className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Save this place</span>
                        </label>
                        {savePickup && (
                          <motion.input
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            value={saveLabel}
                            onChange={(e) => setSaveLabel(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900 rounded-xl px-4 py-2 text-xs font-bold border border-blue-200 dark:border-blue-800 outline-none focus:border-blue-500"
                            placeholder="Label (e.g. Office)"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Order Summary</h3>
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Service</span>
                          <span className="text-sm font-black text-slate-900 uppercase">{LAUNDRY_SERVICES.find(s => s.id === selectedServiceId)?.title}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Pickup Mode</span>
                          <span className="text-sm font-black text-slate-900 uppercase">{pickupType === 'now' ? 'ASAP' : 'Schedule'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Contact</span>
                          <span className="text-sm font-black text-slate-900 tracking-widest">{contactPhone}</span>
                        </div>
                        <div className="pt-4 mt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Est. Collection</span>
                          <div className="text-right">
                            <span className="text-lg font-black text-slate-900 italic">Free Delivery</span>
                            <div className="text-[10px] font-bold text-slate-400">T&C Apply *</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {isLoadingSaved && (
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 animate-pulse">
                          <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest uppercase">Syncing saved places...</span>
                        </div>
                      )}
                      {savedAddresses.length > 0 && !isLoadingSaved && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Quick Select Saved Place</label>
                          <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                            {savedAddresses.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setPickupAddress(item.address ?? '');
                                  setPickupLatitude(String(item.latitude));
                                  setPickupLongitude(String(item.longitude));
                                  if (item.contactPhone) setContactPhone(item.contactPhone);
                                }}
                                className="text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                              >
                                <div className="font-black text-[10px] text-slate-900 dark:text-white uppercase truncate">{item.label}</div>
                                <div className="text-[9px] text-slate-400 truncate mt-0.5">{item.address}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col gap-6">
                  {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-5">
                      <XCircle className="text-rose-600 h-5 w-5" />
                      <p className="text-sm font-bold text-rose-700">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
                      <CheckCircle className="text-emerald-600 h-5 w-5" />
                      <p className="text-sm font-bold text-emerald-700">{success}</p>
                    </motion.div>
                  )}

                  <div className="flex justify-between gap-4">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Back
                    </button>
                    <button
                      onClick={(e: React.MouseEvent) => onSubmit(e as any)}
                      disabled={!canSubmit || isLoading}
                      className="group relative flex-1 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-blue-700 hover:shadow-glow transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? "Synchronizing Order..." : "Finalize & Send Request"}
                      {!isLoading && <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                      {!isLoading && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
