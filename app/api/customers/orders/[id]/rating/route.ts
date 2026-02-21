import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  await new Promise(resolve => setTimeout(resolve, 1000));

  const rating = {
    orderId: id,
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('Rating submitted:', rating);

  return NextResponse.json({
    success: true,
    message: 'Rating submitted successfully',
    rating,
  });
}
