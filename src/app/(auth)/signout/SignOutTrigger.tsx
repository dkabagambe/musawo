"use client";

/**
 * Auto-submits the sign-out server action on mount.
 * This is a thin client wrapper so the form submission happens
 * immediately when the page loads, without the user needing to click.
 * The server action redirects to /login after clearing the session.
 */
import { useEffect, useRef } from "react";

interface Props {
  action: () => Promise<void>;
}

export default function SignOutTrigger({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Submit the form on first render (auto sign-out)
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={action} aria-hidden="true" className="hidden">
      <button type="submit">Sign out</button>
    </form>
  );
}
