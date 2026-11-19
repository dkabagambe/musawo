import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import BreakGlassManager from './BreakGlassManager';

export const metadata = {
  title: 'Break-glass Requests - IT Admin',
  description: 'Emergency access to business data with Director approval',
};

export const dynamic = 'force-dynamic';

export default async function BreakGlassPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Break-glass Emergency Access</h1>
        <p className="text-gray-500 mt-1">
          Request temporary read-only access to business data for troubleshooting. Requires Director approval and 2FA.
        </p>
      </div>

      <BreakGlassManager userId={session.user.id} />
    </div>
  );
}
