"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPostLoginPath } from "@/lib/auth/redirect";

export default function DevLoginForm({ email, password }: { email: string; password: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await signIn("credentials", { identifier: email, password, redirect: false });
    if (result?.error) {
      alert(`Login failed: ${result.error}`);
      setLoading(false);
      return;
    }
    const res  = await fetch("/api/auth/session");
    const data = await res.json() as { user?: { role?: string } };
    router.push(getPostLoginPath(data?.user?.role, undefined, window.location.origin));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : "Sign in →"}
    </button>
  );
}
