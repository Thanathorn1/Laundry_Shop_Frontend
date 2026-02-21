export { };

declare global {
    interface Window {
        longdo: any;
    }
}

declare module 'next/link' {
    import Link from 'next/dist/client/link';
    export default Link;
}

// Profile & User Types
export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    phoneVerified: boolean;
    profileImageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SavedAddress {
    id: string;
    label: string; // "Home", "Work", "Other"
    address: string;
    latitude: number;
    longitude: number;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LoginDevice {
    id: string;
    deviceName: string;
    lastAccessedAt: string;
    ipAddress: string;
    isCurrent: boolean;
}

// Rating & Review Types
export interface OrderRating {
    orderId: string;
    merchantRating: number; // 1-5
    riderRating: number; // 1-5
    merchantComment?: string;
    riderComment?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RatingSubmission {
    orderId: string;
    merchantRating: number;
    riderRating: number;
    merchantComment?: string;
    riderComment?: string;
}

