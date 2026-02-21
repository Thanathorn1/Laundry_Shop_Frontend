import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('profileImage') as File;

  // Simulate file upload delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!file) {
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    );
  }

  // Mock image URL - in real backend, save file and return URL
  const mockImageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;

  return NextResponse.json({
    profileImageUrl: mockImageUrl,
    message: 'Profile image uploaded successfully',
  });
}
