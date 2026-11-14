# T2 Messaging - Implementation Complete

## What was built

Two-way direct messaging between tutors (instructors) and students.

## Schema

Three new Prisma models added via migration `20261113120000_t2_messaging`:
- `Conversation` - thread container with optional `broadcastLabel`
- `ConversationParticipant` - participant with `lastReadAt` for unread tracking
- `DirectMessage` - individual messages (body max 2000 chars, HTML-escaped)
- `MessageEmailThrottle` - prevents email spam (1 email per conversation per 15 min)

## API routes

- `GET /api/conversations` - list conversations with unread count and last message preview
- `POST /api/conversations` - start or return existing conversation (permission-scoped)
- `GET /api/conversations/[id]/messages` - read messages, marks conversation as read
- `POST /api/conversations/[id]/messages` - send a message (rate-limited 20/min)
- `POST /api/conversations/[id]/read` - mark as read
- `GET /api/conversations/unread-count` - badge count
- `POST /api/conversations/broadcast` - message a whole course or class (5 broadcasts/10min)
- `GET /api/conversations/moderation` - Principal safeguarding view with audit log

## UI

- `src/components/messaging/ConversationPanel.tsx` - split-view desktop, single-panel mobile
- `src/components/messaging/MessageDrawer.tsx` - portal overlay for student card drawer
- `src/components/messaging/BroadcastForm.tsx` - tutor broadcast to whole course
- `src/components/messaging/ModerationView.tsx` - Principal moderation panel
- `src/components/ui/AvatarOrInitials.tsx` - shared avatar/initials component
- `src/hooks/useUnreadMessageCount.ts` - 10-second polling hook for badge

## Changed pages

- `/tutor/students` - added Message button per student row (opens drawer)
- `/tutor/messages` - full split-view conversation panel + broadcast form
- `/dashboard/messages` - student full split-view panel
- `/principal/messages` - added safeguarding moderation section
- AppShell topbar - unread message count badge on mail icon

## Safety

- Tutors may only message students in their own courses (enforced server-side)
- Students may only message their own instructors or admin/principal
- Rate limit 20 messages/min per user (Redis sliding window, fail-open)
- HTML-escaped before storage
- Principal can view all conversations - every view audited (MESSAGE_MODERATION_VIEW)
- Email notifications throttled: at most 1 per conversation per 15 minutes

## Delivery

Polling every 10 seconds in ConversationPanel (SSE not needed; polling meets the 10s spec).

## Tests

`e2e/messaging.spec.ts` - 10 tests, all passing. Covers: Message button, send, receive badge, student reply, tutor sees reply, read receipt clears badge, broadcast form, 403 cross-tutor, 429 rate limit, 390px mobile.
