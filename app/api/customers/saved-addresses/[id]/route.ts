import { NextRequest, NextResponse } from 'next/server';

const mockAddresses: Record<string, any> = {
  'addr-001': {
    id: 'addr-001',
    label: 'บ้าน',
    address: '123 ซอยเทพลิลา เขตวัฒนา กรุงเทพมหานคร 10110',
    latitude: 13.7563,
    longitude: 100.5018,
    isDefault: true,
  },
  'addr-002': {
    id: 'addr-002',
    label: 'ที่ทำงาน',
    address: '456 ถนนสิลม เขตบางรัก กรุงเทพมหานคร 10500',
    latitude: 13.7280,
    longitude: 100.5307,
    isDefault: false,
  },
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!mockAddresses[id]) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  delete mockAddresses[id];
  return NextResponse.json({ success: true });
}
