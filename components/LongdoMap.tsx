"use client";

import { useEffect, useRef } from 'react';

interface LongdoMapProps {
    id: string;
    callback?: (map: any) => void;
    className?: string;
}

declare global {
    interface Window {
        longdo: any;
    }
}

export default function LongdoMap({ id, callback, className }: LongdoMapProps) {
    const mapRef = useRef<any>(null);

    useEffect(() => {
        const initMap = () => {
            if (window.longdo && !mapRef.current) {
                const map = new window.longdo.Map({
                    placeholder: document.getElementById(id),
                    language: 'th'
                });
                mapRef.current = map;
                if (callback) callback(map);
            }
        };

        if (window.longdo) {
            initMap();
        } else {
            // If script is not loaded yet, wait for it
            const interval = setInterval(() => {
                if (window.longdo) {
                    initMap();
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [id, callback]);

    return <div id={id} className={className} style={{ width: '100%', height: '100%' }}></div>;
}
