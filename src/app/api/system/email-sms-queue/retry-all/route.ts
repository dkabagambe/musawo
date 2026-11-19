import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // In a real implementation, this would:
    // 1. Find all failed messages
    // 2. Re-queue them for delivery
    // 3. Update retry counts
    
    const count = 0; // Would be actual count of messages

    await auditLog({
      userId: session.user.id,
      action: 'messages_retry_all',
      details: {
        count,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Failed to retry messages:', error);
    return NextResponse.json(
      { error: 'Failed to retry messages' },
      { status: 500 }
    );
  }
}
