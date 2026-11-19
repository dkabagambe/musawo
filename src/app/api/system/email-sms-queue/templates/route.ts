import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Define available email templates
const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Musawo Academy',
    description: 'Sent to new users upon registration',
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    subject: 'Reset Your Password',
    description: 'Password reset link',
  },
  {
    id: 'exam-reminder',
    name: 'Exam Reminder',
    subject: 'Upcoming Exam Reminder',
    description: 'Sent 24 hours before an exam',
  },
  {
    id: 'class-reminder',
    name: 'Class Reminder',
    subject: 'Live Class Starting Soon',
    description: 'Sent 15 minutes before a live class',
  },
  {
    id: 'payment-confirmation',
    name: 'Payment Confirmation',
    subject: 'Payment Received',
    description: 'Sent when payment is confirmed',
  },
  {
    id: 'certificate-ready',
    name: 'Certificate Ready',
    subject: 'Your Certificate is Ready',
    description: 'Sent when a certificate is generated',
  },
];

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      templates: EMAIL_TEMPLATES,
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}
