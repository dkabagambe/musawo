import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if email provider is configured
    const emailConfigured = !!process.env.RESEND_API_KEY;
    const smsConfigured = !!process.env.SMS_API_KEY;

    // In a real implementation, these would come from a queue table or service
    // For now, return placeholder stats
    return NextResponse.json({
      email: {
        sent: 0,
        queued: 0,
        failed: 0,
        bounces: 0,
        complaints: 0,
      },
      sms: {
        sent: 0,
        queued: 0,
        failed: 0,
      },
      demoMode: !emailConfigured,
    });
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return NextResponse.json(
      { error: 'Failed to get queue stats' },
      { status: 500 }
    );
  }
}
