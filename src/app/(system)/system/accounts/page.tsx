import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import AccountSupportManager from './AccountSupportManager';

export const metadata = {
  title: 'Account Support - IT Admin',
  description: 'User account management and support actions',
};

export const dynamic = 'force-dynamic';

export default async function AccountSupportPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Support</h1>
        <p className="text-gray-500 mt-1">
          Look up users and perform account management actions. Technical data only, no business data.
        </p>
      </div>

      <AccountSupportManager />
    </div>
  );
}
