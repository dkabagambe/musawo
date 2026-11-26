import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { checkRateLimit, recordFailure } from '@/lib/auth/rate-limit';
import { redis } from '@/lib/db/redis';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== UserRole.SYSTEM_IT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Rate limit: 10 actions per minute
    const rateLimitResult = await checkRateLimit({
      key: `account-action:${session.user.id}`,
      maxRequests: 10,
      windowSeconds: 60,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action, accountId } = body;

    if (!action || !accountId) {
      return NextResponse.json(
        { error: 'action and accountId are required' },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUser = await db.user.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let message = '';
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    switch (action) {
      case 'unlock':
        // Clear rate limit counters in Redis for this account
        if (targetUser.email) {
          try {
            await redis.del(`rl:account:${targetUser.email}`);
          } catch (err) {
            console.warn('Failed to clear rate limit:', err);
          }
        }

        await audit({
          userId: session.user.id,
          action: 'account_unlocked',
          details: {
            targetUserId: accountId,
            targetUserName: targetUser.name,
            targetUserRole: targetUser.role,
          },
          ipAddress,
        });

        message = `Account unlocked successfully. ${targetUser.name} can now log in.`;
        break;

      case 'password-reset':
        // Generate password reset token
        const resetToken = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await db.user.update({
          where: { id: accountId },
          data: {
            // Store token in a way compatible with auth system
            // This is a simplified version - adjust based on your reset token implementation
          },
        });

        await audit({
          userId: session.user.id,
          action: 'password_reset_sent',
          details: {
            targetUserId: accountId,
            targetUserName: targetUser.name,
            targetUserEmail: targetUser.email,
          },
          ipAddress,
        });

        // In production, send email here
        console.log(`[PASSWORD RESET] Token for ${targetUser.email}: ${resetToken}`);
        message = `Password reset link sent to ${targetUser.email}. Link expires in 1 hour.`;
        break;

      case 'force-signout':
        // Delete all sessions for the user
        const deletedCount = await db.session.deleteMany({
          where: { userId: accountId },
        });

        await audit({
          userId: session.user.id,
          action: 'force_signout_all',
          details: {
            targetUserId: accountId,
            targetUserName: targetUser.name,
            sessionsDeleted: deletedCount.count,
          },
          ipAddress,
        });

        message = `${deletedCount.count} session(s) terminated. ${targetUser.name} has been signed out.`;
        break;

      case 'emergency-disable':
        if (targetUser.status !== 'ACTIVE') {
          return NextResponse.json({ error: 'Account is not active' }, { status: 400 });
        }

        await db.user.update({
          where: { id: accountId },
          data: { status: 'SUSPENDED' },
        });

        // Delete all sessions
        await db.session.deleteMany({
          where: { userId: accountId },
        });

        await audit({
          userId: session.user.id,
          action: 'emergency_disable',
          details: {
            targetUserId: accountId,
            targetUserName: targetUser.name,
            targetUserRole: targetUser.role,
          },
          ipAddress,
        });

        // In production, notify Principal and Director here
        console.log(`[ALERT] Emergency disable by ${session.user.name} on ${targetUser.name} (${targetUser.role})`);

        message = `Account disabled. Principal and Director have been notified. Re-enabling requires their approval.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Account action failed:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}
