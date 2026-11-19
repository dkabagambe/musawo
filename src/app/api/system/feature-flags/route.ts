import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Define available feature flags
const FEATURE_FLAGS = [
  {
    key: 'feature.scholarships',
    name: 'Scholarships',
    description: 'Enable scholarship applications and management',
    productionSafe: true,
  },
  {
    key: 'feature.registrarActive',
    name: 'Registrar Portal',
    description: 'Enable the registrar role and portal',
    productionSafe: true,
  },
  {
    key: 'feature.demoMode',
    name: 'Demo Mode',
    description: 'Enable demo features and sample data (development only)',
    productionSafe: false,
  },
  {
    key: 'feature.readOnlyMode',
    name: 'Read-Only Mode',
    description: 'Disable all write operations (emergency use)',
    productionSafe: true,
  },
  {
    key: 'feature.newExamInterface',
    name: 'New Exam Interface',
    description: 'Enable the redesigned exam taking interface',
    productionSafe: true,
  },
  {
    key: 'feature.advancedReporting',
    name: 'Advanced Reporting',
    description: 'Enable advanced analytics and custom reports',
    productionSafe: true,
  },
];

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current environment
    const appEnv = process.env.APP_ENV || 'development';

    // Fetch all flag values from database
    const flagSettings = await db.siteSetting.findMany({
      where: {
        key: {
          in: FEATURE_FLAGS.map(f => f.key),
        },
      },
    });

    // Get change metadata for each flag
    const metadataSettings = await db.siteSetting.findMany({
      where: {
        key: {
          in: FEATURE_FLAGS.flatMap(f => [
            `${f.key}.changedBy`,
            `${f.key}.changedAt`,
          ]),
        },
      },
    });

    const metadataMap = metadataSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    const flags = FEATURE_FLAGS.map(flag => {
      const setting = flagSettings.find(s => s.key === flag.key);
      return {
        ...flag,
        enabled: setting?.value === 'true',
        lastChangedBy: metadataMap[`${flag.key}.changedBy`] || null,
        lastChangedAt: metadataMap[`${flag.key}.changedAt`] || null,
      };
    });

    return NextResponse.json({
      flags,
      appEnv,
    });
  } catch (error) {
    console.error('Failed to get feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to get feature flags' },
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
    const { key, enabled } = body;

    if (!key || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'key and enabled are required' },
        { status: 400 }
      );
    }

    // Find the flag definition
    const flagDef = FEATURE_FLAGS.find(f => f.key === key);
    if (!flagDef) {
      return NextResponse.json({ error: 'Invalid flag key' }, { status: 400 });
    }

    // Check if this is production and flag is not production-safe
    const appEnv = process.env.APP_ENV || 'development';
    if (appEnv === 'production' && !flagDef.productionSafe && enabled) {
      return NextResponse.json(
        { error: 'This flag cannot be enabled in production' },
        { status: 400 }
      );
    }

    // Get previous value for audit
    const prevSetting = await db.siteSetting.findUnique({
      where: { key },
    });

    // Update flag and metadata in transaction
    await db.$transaction([
      db.siteSetting.upsert({
        where: { key },
        create: { key, value: enabled.toString() },
        update: { value: enabled.toString() },
      }),
      db.siteSetting.upsert({
        where: { key: `${key}.changedBy` },
        create: { key: `${key}.changedBy`, value: session.user.name },
        update: { value: session.user.name },
      }),
      db.siteSetting.upsert({
        where: { key: `${key}.changedAt` },
        create: { key: `${key}.changedAt`, value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      }),
    ]);

    // Audit log
    await auditLog({
      userId: session.user.id,
      action: 'feature_flag_changed',
      details: {
        flag: key,
        flagName: flagDef.name,
        previousValue: prevSetting?.value === 'true',
        newValue: enabled,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      key,
      name: flagDef.name,
      enabled,
      lastChangedBy: session.user.name,
      lastChangedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
