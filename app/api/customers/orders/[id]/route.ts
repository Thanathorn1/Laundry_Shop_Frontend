import { NextRequest, NextResponse } from 'next/server';

const mockOrders: Record<string, any> = {
  'order-001': {
    id: 'order-001',
    orderNumber: 'ORD-20260220-001',
    merchantName: 'ร้าน สมุดโน้ต Coffee',
    riderName: 'สมปอง',
    totalAmount: 185.00,
    status: 'completed',
    createdAt: '2026-02-20T10:30:00Z',
    completedAt: '2026-02-20T11:15:00Z',
    deliveryAddress: '123 ซอยเทพลิลา เขตวัฒนา กรุงเทพมหานคร',
  },
  'order-002': {
    id: 'order-002',
    orderNumber: 'ORD-20260220-002',
    merchantName: 'ร้าน อร่อยจัง',
    riderName: 'สม',
    totalAmount: 250.00,
    status: 'completed',
    createdAt: '2026-02-19T14:45:00Z',
    completedAt: '2026-02-19T15:30:00Z',
    deliveryAddress: '456 ถนนสิลม เขตบางรัก กรุงเทพมหานคร',
  },
  'order-003': {
    id: 'order-003',
    orderNumber: 'ORD-20260220-003',
    merchantName: 'ร้าน โจโจ่',
    riderName: 'วิชิต',
    totalAmount: 315.00,
    status: 'delivering',
    createdAt: '2026-02-20T16:00:00Z',
    deliveryAddress: '789 เขตสาย 4 กรุงเทพมหานคร',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!mockOrders[id]) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(mockOrders[id]);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!mockOrders[id]) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }

  const rating = {
    orderId: id,
    ...body,
    createdAt: new Date().toISOString(),
  };

  // Store rating (in real backend, save to database)
  console.log('Rating submitted:', rating);

  return NextResponse.json({
    success: true,
    message: 'Rating submitted successfully',
    rating,
  });
}
