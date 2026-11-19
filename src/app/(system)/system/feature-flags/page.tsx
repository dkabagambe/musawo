import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import FeatureFlagsManager from './FeatureFlagsManager';

export const metadata = {
  title: 'Feature Flags - IT Admin',
  description: 'Manage feature flags and toggles',
};

export const dynamic = 'force-dynamic';

export default async function FeatureFlagsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground mt-1">
          Enable or disable features across the platform. Production-unsafe flags cannot be enabled in production.
        </p>
      </div>

      <FeatureFlagsManager userId={session.user.id} />
    </div>
  );
}
