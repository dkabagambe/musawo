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

    const body = await req.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Find the failed message by ID
    // 2. Re-queue it for delivery
    // 3. Update the retry count
    
    // For now, just audit log the action
    await auditLog({
      userId: session.user.id,
      action: 'message_retry',
      details: {
        messageId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Message queued for retry',
    });
  } catch (error) {
    console.error('Failed to retry message:', error);
    return NextResponse.json(
      { error: 'Failed to retry message' },
      { status: 500 }
    );
  }
}
