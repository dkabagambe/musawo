import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // Search by email (exact) or name (contains)
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLogin: true,
        totpEnabled: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return technical data only (no business data)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin?.toISOString() || null,
      twoFactorEnabled: user.totpEnabled,
      locked: false, // Locking handled by rate limiter in Redis
      activeSessions: user._count.sessions,
    });
  } catch (error) {
    console.error('Account lookup failed:', error);
    return NextResponse.json(
      { error: 'Lookup failed' },
      { status: 500 }
    );
  }
}
