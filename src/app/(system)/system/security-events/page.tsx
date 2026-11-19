import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import SecurityEventsViewer from './SecurityEventsViewer';

export const metadata = {
  title: 'Security Events - IT Admin',
  description: 'Monitor security events and suspicious activity',
};

export const dynamic = 'force-dynamic';

export default async function SecurityEventsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security Events</h1>
        <p className="text-gray-500 mt-1">
          Failed logins, lockouts, rate limit hits, 2FA events, and suspicious patterns across the platform.
        </p>
      </div>

      <SecurityEventsViewer />
    </div>
  );
}
