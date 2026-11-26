import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requestId = params.id;

    // Audit log the revocation
    await audit({
      userId: session.user.id,
      action: 'break_glass_revoked',
      details: {
        requestId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Access revoked successfully',
    });
  } catch (error) {
    console.error('Failed to revoke break-glass access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke access' },
      { status: 500 }
    );
  }
}
