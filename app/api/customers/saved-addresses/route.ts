import { NextRequest, NextResponse } from 'next/server';

// Mock saved addresses
const mockAddresses = [
  {
    id: 'addr-001',
    label: 'บ้าน',
    address: '123 ซอยเทพลิลา เขตวัฒนา กรุงเทพมหานคร 10110',
    latitude: 13.7563,
    longitude: 100.5018,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-20T00:00:00Z',
  },
  {
    id: 'addr-002',
    label: 'ที่ทำงาน',
    address: '456 ถนนสิลม เขตบางรัก กรุงเทพมหานคร 10500',
    latitude: 13.7280,
    longitude: 100.5307,
    isDefault: false,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2026-02-20T00:00:00Z',
  },
];

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 800));
  return NextResponse.json({ addresses: mockAddresses });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  await new Promise(resolve => setTimeout(resolve, 1000));

  const newAddress = {
    id: `addr-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockAddresses.push(newAddress);
  return NextResponse.json(newAddress);
}
