import { NextRequest, NextResponse } from 'next/server';

// Mock data
const mockProfile = {
  id: 'cust-001',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  email: 'somchai@example.com',
  phoneNumber: '+66812345678',
  phoneVerified: true,
  profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=somchai',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-02-20T00:00:00Z',
};

export async function GET() {
  return NextResponse.json(mockProfile);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const updatedProfile = {
    ...mockProfile,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(updatedProfile);
}
