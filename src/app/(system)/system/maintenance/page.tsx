import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import MaintenanceControl from './MaintenanceControl';

export const metadata = {
  title: 'Maintenance Mode - IT Admin',
  description: 'System maintenance mode control',
};

export default async function MaintenanceModePage() {
  const session = await auth();

  if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance Mode</h1>
        <p className="text-muted-foreground mt-1">
          Control system-wide maintenance mode. Students and instructors will see a maintenance page while active.
        </p>
      </div>

      <MaintenanceControl userId={session.user.id} />
    </div>
  );
}
