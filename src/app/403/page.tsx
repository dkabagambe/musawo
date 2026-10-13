import Link from "next/link";
import { auth } from "@/lib/auth";
import { getHomePathForRole } from "@/lib/auth/redirect";

export const metadata = { title: "Access Denied - Musawo Training Center" };

export default async function ForbiddenPage() {
  const session = await auth();
  const home = session?.user ? getHomePathForRole(session.user.role) : "/login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="card max-w-md w-full text-center py-12">
        <p className="text-5xl mb-4" aria-hidden="true">🔒</p>
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          You don&apos;t have permission to view this page. If you believe this is
          a mistake, please contact your administrator or the MTC support team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={home} className="btn-primary no-underline">
            Go to my dashboard
          </Link>
          <Link href="/contact" className="btn-outline no-underline">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
