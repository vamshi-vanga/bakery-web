import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    user: {
      id: 'usr_superadmin',
      name: 'Executive Admin',
      email: 'admin@crumblbakery.com',
      role: 'super_admin',
      branch_id: 'ALL',
      branch_name: 'All Franchises (Group HQ)',
    },
  });
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
