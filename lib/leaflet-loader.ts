"use client";

export interface LatLng {
    lat: number;
    lng: number;
}

export interface LeafletMarker {
    addTo: (map: LeafletMap) => LeafletMarker;
    on: (event: string, handler: (event: any) => void) => void;
    getLatLng: () => LatLng;
    setLatLng: (latLng: LatLng) => void;
    remove: () => void;
}

export interface LeafletMap {
    on: (event: string, handler: (event: { latlng: LatLng }) => void) => void;
    panTo: (latLng: [number, number]) => void;
    remove: () => void;
    invalidateSize: () => void;
}

export interface LeafletLib {
    map: (container: HTMLElement, options: any) => LeafletMap;
    tileLayer: (url: string, options: any) => { addTo: (map: LeafletMap) => void };
    marker: (latLng: [number, number] | LatLng, options?: any) => LeafletMarker;
    divIcon: (options: any) => any;
    Icon: {
        Default: {
            mergeOptions: (options: any) => void;
            prototype: any;
        };
    };
}

let leafletPromise: Promise<LeafletLib | null> | null = null;

export async function loadLeaflet(): Promise<LeafletLib | null> {
    if (typeof window === "undefined") return null;

    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise<LeafletLib | null>(async (resolve, reject) => {
        try {
            const w = window as any;

            // Inject CSS if not present
            if (!document.querySelector('link[data-leaflet="true"]')) {
                const css = document.createElement("link");
                css.rel = "stylesheet";
                css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                css.setAttribute("data-leaflet", "true");
                document.head.appendChild(css);
            }

            // Inject JS if not present
            if (!w.L) {
                await new Promise<void>((res, rej) => {
                    const script = document.createElement("script");
                    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
                    script.async = true;
                    script.setAttribute("data-leaflet", "true");
                    script.onload = () => res();
                    script.onerror = () => rej(new Error("Failed to load Leaflet script"));
                    document.body.appendChild(script);
                });
            }

            const L = w.L as LeafletLib;
            if (!L) {
                resolve(null);
                return;
            }

            // GLOBAL FIX: Apply icon fix once and for all
            if (L.Icon && L.Icon.Default) {
                // Clear potential defaults that might be broken
                delete L.Icon.Default.prototype._getIconUrl;

                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                });
            }

            resolve(L);
        } catch (error) {
            console.error("Leaflet load error:", error);
            reject(error);
        }
    });

    return leafletPromise;
}
