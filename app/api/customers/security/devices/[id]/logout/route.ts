import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await new Promise(resolve => setTimeout(resolve, 800));

  if (id === 'dev-001') {
    return NextResponse.json(
      { error: 'Cannot logout current device' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Device logged out successfully',
  });
}
