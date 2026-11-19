import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get maintenance mode status from site settings
    const maintenanceEnabled = await db.siteSetting.findUnique({
      where: { key: 'system.maintenanceMode' },
    });

    const maintenanceMessage = await db.siteSetting.findUnique({
      where: { key: 'system.maintenanceMessage' },
    });

    const maintenanceEnd = await db.siteSetting.findUnique({
      where: { key: 'system.maintenanceExpectedEnd' },
    });

    const maintenanceChangedBy = await db.siteSetting.findUnique({
      where: { key: 'system.maintenanceChangedBy' },
    });

    const maintenanceChangedAt = await db.siteSetting.findUnique({
      where: { key: 'system.maintenanceChangedAt' },
    });

    return NextResponse.json({
      enabled: maintenanceEnabled?.value === 'true',
      message: maintenanceMessage?.value || null,
      expectedEnd: maintenanceEnd?.value || null,
      lastChangedBy: maintenanceChangedBy?.value || null,
      lastChangedAt: maintenanceChangedAt?.value || null,
    });
  } catch (error) {
    console.error('Failed to get maintenance status:', error);
    return NextResponse.json(
      { error: 'Failed to get maintenance status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { enabled, message, expectedEnd } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    // Get previous state for audit
    const prevEnabled = await db.siteSetting.findUnique({
      where: { key: 'system.maintenanceMode' },
    });

    // Update all maintenance settings in a transaction
    await db.$transaction([
      db.siteSetting.upsert({
        where: { key: 'system.maintenanceMode' },
        create: { key: 'system.maintenanceMode', value: enabled.toString() },
        update: { value: enabled.toString() },
      }),
      db.siteSetting.upsert({
        where: { key: 'system.maintenanceMessage' },
        create: { key: 'system.maintenanceMessage', value: message || '' },
        update: { value: message || '' },
      }),
      db.siteSetting.upsert({
        where: { key: 'system.maintenanceExpectedEnd' },
        create: { key: 'system.maintenanceExpectedEnd', value: expectedEnd || '' },
        update: { value: expectedEnd || '' },
      }),
      db.siteSetting.upsert({
        where: { key: 'system.maintenanceChangedBy' },
        create: { key: 'system.maintenanceChangedBy', value: session.user.name },
        update: { value: session.user.name },
      }),
      db.siteSetting.upsert({
        where: { key: 'system.maintenanceChangedAt' },
        create: { key: 'system.maintenanceChangedAt', value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      }),
    ]);

    // Audit log the change
    await auditLog({
      userId: session.user.id,
      action: 'maintenance_mode_changed',
      details: {
        previousState: prevEnabled?.value === 'true',
        newState: enabled,
        message: message || null,
        expectedEnd: expectedEnd || null,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      enabled,
      message: message || null,
      expectedEnd: expectedEnd || null,
      lastChangedBy: session.user.name,
      lastChangedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update maintenance mode:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance mode' },
      { status: 500 }
    );
  }
}
