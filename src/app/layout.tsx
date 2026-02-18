import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
    title: 'LaundryPro — Premium Laundry Service',
    description: 'Quality laundry service with multi-branch support, online ordering, and real-time tracking.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-[#F8FAFF]">
                <Navbar />
                <main>{children}</main>
                <footer className="bg-primary text-white py-12 mt-20">
                    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <span className="text-2xl">🫧</span>
                                <span className="text-xl font-bold">LaundryPro</span>
                            </div>
                            <p className="text-blue-200 text-sm">Premium laundry service with care and precision. Your clothes deserve the best.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Services</h4>
                            <ul className="space-y-2 text-blue-200 text-sm">
                                <li>Wash & Dry</li>
                                <li>Dry Cleaning</li>
                                <li>Ironing</li>
                                <li>Duvet & Blanket</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Contact</h4>
                            <ul className="space-y-2 text-blue-200 text-sm">
                                <li>📞 02-123-4567</li>
                                <li>📧 hello@laundrypro.com</li>
                                <li>📍 Bangkok, Thailand</li>
                            </ul>
                        </div>
                    </div>
                    <div className="text-center text-blue-300 text-sm mt-8 border-t border-blue-800 pt-6">
                        © 2025 LaundryPro. All rights reserved.
                    </div>
                </footer>
            </body>
        </html>
    )
}
