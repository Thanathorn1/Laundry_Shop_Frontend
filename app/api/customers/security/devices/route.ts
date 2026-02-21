import { NextRequest, NextResponse } from 'next/server';

const mockDevices = [
  {
    id: 'dev-001',
    deviceName: 'Chrome on Windows',
    lastAccessedAt: new Date().toISOString(),
    ipAddress: '192.168.1.100',
    isCurrent: true,
  },
  {
    id: 'dev-002',
    deviceName: 'Safari on iPhone',
    lastAccessedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.50',
    isCurrent: false,
  },
  {
    id: 'dev-003',
    deviceName: 'Chrome on Android',
    lastAccessedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.75',
    isCurrent: false,
  },
];

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 800));
  return NextResponse.json({ devices: mockDevices });
}
