/**
 * /register is removed.
 * Public self-registration is not available.
 * All applicants use /apply to submit an Application record.
 * The Registrar creates student accounts from accepted applications.
 */

import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/apply");
}
