import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Map time range to hours
const TIME_RANGE_MAP: Record<string, number> = {
  '1h': 1,
  '24h': 24,
  '7d': 168,
  '30d': 720,
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const role = searchParams.get('role');
    const timeRange = searchParams.get('timeRange') || '24h';
    const search = searchParams.get('search');

    // Calculate time threshold
    const hours = TIME_RANGE_MAP[timeRange] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Build where clause
    const where: any = {
      createdAt: {
        gte: since,
      },
      // Filter for security-related actions
      action: {
        in: [
          'login_failed',
          'account_locked',
          'rate_limit_exceeded',
          'new_device_login',
          'totp_failed',
          'totp_success',
          'totp_enabled',
          'totp_disabled',
          'suspicious_activity',
          'password_reset_requested',
          'account_unlocked',
          'force_signout_all',
          'emergency_disable',
        ],
      },
    };

    // Apply filters
    if (type) {
      where.action = type;
    }

    if (search) {
      where.OR = [
        { details: { path: ['userName'], string_contains: search } },
        { details: { path: ['userEmail'], string_contains: search } },
        { details: { path: ['ipAddress'], string_contains: search } },
      ];
    }

    // Fetch audit logs (these are our security events)
    const auditLogs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        action: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Transform to security events format
    const events = auditLogs.map((log) => {
      const details = log.details as any;
      
      // Determine severity based on action type
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (log.action === 'emergency_disable' || log.action === 'account_locked') {
        severity = 'critical';
      } else if (log.action === 'suspicious_activity' || log.action === 'rate_limit_exceeded') {
        severity = 'high';
      } else if (log.action === 'login_failed' || log.action === 'totp_failed') {
        severity = 'medium';
      }

      // Filter by role if specified
      if (role && log.user?.role !== role) {
        return null;
      }

      // Filter by severity if specified
      if (severity && severity !== getSeverityFromAction(log.action)) {
        return null;
      }

      // Generate human-readable description
      const description = generateDescription(log.action, details, log.user);

      return {
        id: log.id,
        type: log.action,
        severity,
        userName: log.user?.name || details?.targetUserName || null,
        userEmail: log.user?.email || details?.targetUserEmail || details?.email || null,
        userRole: log.user?.role || details?.targetUserRole || null,
        ipAddress: log.ipAddress || details?.ipAddress || 'unknown',
        userAgent: details?.userAgent || null,
        description,
        metadata: details,
        createdAt: log.createdAt.toISOString(),
      };
    }).filter(Boolean);

    // Apply severity filter if needed
    const filteredEvents = severity
      ? events.filter((e) => e && e.severity === severity)
      : events;

    return NextResponse.json({
      events: filteredEvents,
      total: filteredEvents.length,
    });
  } catch (error) {
    console.error('Failed to fetch security events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}

function getSeverityFromAction(action: string): 'low' | 'medium' | 'high' | 'critical' {
  if (action === 'emergency_disable' || action === 'account_locked') {
    return 'critical';
  } else if (action === 'suspicious_activity' || action === 'rate_limit_exceeded') {
    return 'high';
  } else if (action === 'login_failed' || action === 'totp_failed') {
    return 'medium';
  }
  return 'low';
}

function generateDescription(action: string, details: any, user: any): string {
  const userName = user?.name || details?.targetUserName || details?.email || 'Unknown user';
  
  switch (action) {
    case 'login_failed':
      return `Failed login attempt for ${userName}`;
    case 'account_locked':
      return `Account locked after multiple failed attempts: ${userName}`;
    case 'rate_limit_exceeded':
      return `Rate limit exceeded by ${userName}`;
    case 'new_device_login':
      return `Login from new device: ${userName}`;
    case 'totp_failed':
      return `2FA verification failed: ${userName}`;
    case 'totp_success':
      return `2FA verification successful: ${userName}`;
    case 'totp_enabled':
      return `2FA enabled: ${userName}`;
    case 'totp_disabled':
      return `2FA disabled: ${userName}`;
    case 'suspicious_activity':
      return `Suspicious activity detected: ${userName}`;
    case 'password_reset_requested':
      return `Password reset requested: ${userName}`;
    case 'account_unlocked':
      return `Account unlocked by IT Admin: ${details?.targetUserName || userName}`;
    case 'force_signout_all':
      return `All sessions terminated by IT Admin: ${details?.targetUserName || userName}`;
    case 'emergency_disable':
      return `Account emergency disabled by IT Admin: ${details?.targetUserName || userName}`;
    default:
      return `Security event: ${action}`;
  }
}
