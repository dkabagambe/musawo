/**
 * API routes use auth() which reads headers, making them inherently dynamic.
 * This layout prevents Next.js from attempting static generation on API routes.
 */

export const dynamic = "force-dynamic";

export default function APILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
