import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. Only lock down the "write" actions (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    
    // 2. Look for the secret PIN in the request headers
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.ADMIN_PIN || '779911';

    // 3. If the PIN is missing or wrong, instantly block the request
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized Hacker Blocked!' }, { status: 401 });
    }
  }

  // 4. If the PIN matches, let the request through
  return NextResponse.next();
}

// Tell the proxy to watch all /api routes
export const config = {
  matcher: '/api/:path*',
};