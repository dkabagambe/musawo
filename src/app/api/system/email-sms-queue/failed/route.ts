import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return '***';
  return '***' + phone.slice(-4);
}

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // In a real implementation, fetch from a message queue or failed messages table
    // For now, return empty array
    const messages: any[] = [];

    return NextResponse.json({
      messages,
    });
  } catch (error) {
    console.error('Failed to get failed messages:', error);
    return NextResponse.json(
      { error: 'Failed to get failed messages' },
      { status: 500 }
    );
  }
}
