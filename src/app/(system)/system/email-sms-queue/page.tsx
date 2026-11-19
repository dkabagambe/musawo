import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import EmailSmsQueueManager from './EmailSmsQueueManager';

export const metadata = {
  title: 'Email & SMS Queue - IT Admin',
  description: 'Monitor and manage email and SMS delivery',
};

export const dynamic = 'force-dynamic';

export default async function EmailSmsQueuePage() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email & SMS Queue</h1>
        <p className="text-muted-foreground mt-1">
          Monitor sent, queued and failed messages. Retry failed deliveries and view templates.
        </p>
      </div>

      <EmailSmsQueueManager />
    </div>
  );
}
