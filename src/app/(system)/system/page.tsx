import { redirect } from "next/navigation";

// /system now redirects to /system/health (the main monitoring dashboard)
export default function SystemIndexPage() {
  redirect("/system/health");
}
