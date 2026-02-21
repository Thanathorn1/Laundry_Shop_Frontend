import { NextRequest, NextResponse } from 'next/server';

const mockOrders = [
  {
    id: 'order-001',
    orderNumber: 'ORD-20260220-001',
    merchantName: 'ร้าน สมุดโน้ต Coffee',
    riderName: 'สมปอง',
    totalAmount: 185.00,
    status: 'completed',
    createdAt: '2026-02-20T10:30:00Z',
    completedAt: '2026-02-20T11:15:00Z',
    deliveryAddress: '123 ซอยเทพลิลา เขตวัฒนา กรุงเทพมหานคร',
    hasRating: true,
    rating: {
      merchantRating: 5,
      riderRating: 4,
    },
  },
  {
    id: 'order-002',
    orderNumber: 'ORD-20260220-002',
    merchantName: 'ร้าน อร่อยจัง',
    riderName: 'สม',
    totalAmount: 250.00,
    status: 'completed',
    createdAt: '2026-02-19T14:45:00Z',
    completedAt: '2026-02-19T15:30:00Z',
    deliveryAddress: '456 ถนนสิลม เขตบางรัก กรุงเทพมหานคร',
    hasRating: false,
  },
  {
    id: 'order-003',
    orderNumber: 'ORD-20260220-003',
    merchantName: 'ร้าน โจโจ่',
    riderName: 'วิชิต',
    totalAmount: 315.00,
    status: 'delivering',
    createdAt: '2026-02-20T16:00:00Z',
    deliveryAddress: '789 เขตสาย 4 กรุงเทพมหานคร',
    hasRating: false,
  },
];

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 800));
  return NextResponse.json({ orders: mockOrders });
}
