import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Use cookies for server-side protection in Next.js Middleware
    const token = request.cookies.get('token')?.value;
    const userRole = request.cookies.get('userRole')?.value;
    const riderStatus = request.cookies.get('riderStatus')?.value;

    // Protected paths
    const isAdminPath = pathname.startsWith('/admin');
    const isRiderPath = pathname.startsWith('/rider');
    const isCustomerPath = pathname.startsWith('/customer');

    // If accessing protected routes without token, redirect to login
    if ((isAdminPath || isRiderPath || isCustomerPath) && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-Based Access Control (RBAC)
    if (isAdminPath && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (isRiderPath) {
        if (userRole !== 'rider') {
            return NextResponse.redirect(new URL('/', request.url));
        }
        // Rider must be approved to access rider routes
        if (riderStatus !== 'approved') {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    if (isCustomerPath && userRole !== 'customer' && userRole !== 'user') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/admin/:path*', '/rider/:path*', '/customer/:path*'],
};
