import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { checkRateLimit } from '@/lib/auth/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch break-glass requests for this IT Admin
    // In a real implementation, these would be stored in a dedicated table
    // For now, we'll fetch from audit logs with a specific action pattern
    const auditLogs = await db.auditLog.findMany({
      where: {
        userId: session.user.id,
        action: {
          in: ['break_glass_requested', 'break_glass_approved', 'break_glass_rejected', 'break_glass_revoked'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Transform audit logs to break-glass request format
    // Group by request ID (stored in details.requestId)
    const requestsMap = new Map<string, any>();
    
    for (const log of auditLogs) {
      const details = log.details as any;
      const requestId = details.requestId || log.id;
      
      if (!requestsMap.has(requestId)) {
        requestsMap.set(requestId, {
          id: requestId,
          reason: details.reason || '',
          scope: details.scope || 'one_record',
          scopeDetails: details.scopeDetails || '',
          duration: details.duration || 30,
          status: 'pending' as const,
          requestedAt: log.createdAt.toISOString(),
          approvedAt: null,
          expiresAt: null,
          approvedBy: null,
          queriesCount: 0,
        });
      }

      const request = requestsMap.get(requestId);
      
      if (log.action === 'break_glass_approved') {
        request.status = 'approved';
        request.approvedAt = log.createdAt.toISOString();
        request.approvedBy = details.approvedBy || 'Director';
        request.expiresAt = new Date(log.createdAt.getTime() + request.duration * 60000).toISOString();
        
        // Check if expired
        if (new Date(request.expiresAt) < new Date()) {
          request.status = 'expired';
        }
      } else if (log.action === 'break_glass_rejected') {
        request.status = 'rejected';
        request.approvedAt = log.createdAt.toISOString();
        request.approvedBy = details.approvedBy || 'Director';
      } else if (log.action === 'break_glass_revoked') {
        request.status = 'revoked';
      }
    }

    const requests = Array.from(requestsMap.values());

    return NextResponse.json({
      requests,
    });
  } catch (error) {
    console.error('Failed to fetch break-glass requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
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

    // Rate limit: 3 requests per hour
    const rateLimitResult = await checkRateLimit({
      key: `break-glass:${session.user.id}`,
      maxRequests: 3,
      windowSeconds: 3600,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 3 requests per hour.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { reason, scope, scopeDetails, duration } = body;

    // Validate
    if (!reason || !scope || !scopeDetails || !duration) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (duration > 60) {
      return NextResponse.json(
        { error: 'Maximum duration is 60 minutes' },
        { status: 400 }
      );
    }

    const validScopes = ['one_record', 'one_table', 'user_data'];
    if (!validScopes.includes(scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    // Generate request ID
    const requestId = `bg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Audit log the request
    await audit({
      userId: session.user.id,
      action: 'break_glass_requested',
      details: {
        requestId,
        reason,
        scope,
        scopeDetails,
        duration,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // In production, notify Director here
    console.log(`[BREAK-GLASS] Request ${requestId} from ${session.user.name}: ${reason}`);

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Request submitted to Director for approval',
    });
  } catch (error) {
    console.error('Failed to submit break-glass request:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
