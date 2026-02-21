import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Validate password
  if (body.currentPassword !== 'password123') {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    );
  }

  if (body.newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Password changed successfully',
  });
}
