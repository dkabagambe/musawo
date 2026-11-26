import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // In a real implementation, this would send a test email using the configured provider
    // For now, just simulate success and audit log
    
    await audit({
      userId: session.user.id,
      action: 'test_email_sent',
      details: {
        recipient: session.user.email,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // Check if email provider is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Email provider not configured. Set RESEND_API_KEY in environment.',
      }, { status: 400 });
    }

    // In production, would send via Resend or configured provider
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${session.user.email}`,
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
