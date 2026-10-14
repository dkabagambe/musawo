import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** "light" = white text on teal (default, for heroes/dark bgs). "dark" = grey on white. */
  variant?: "light" | "dark";
  className?: string;
}

export default function Breadcrumb({
  items,
  variant = "light",
  className = "",
}: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];

  const baseLink =
    variant === "light"
      ? "hover:text-white text-white/60 no-underline transition-colors"
      : "hover:text-primary text-gray-400 no-underline transition-colors";
  const current =
    variant === "light" ? "text-white/90 font-medium" : "text-gray-700 font-medium";
  const separator =
    variant === "light" ? "text-white/30" : "text-gray-300";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs list-none">
        {allItems.map((crumb, i) => {
          const isLast = i === allItems.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${separator}`} aria-hidden="true" />
              )}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className={baseLink}>
                  {i === 0 ? (
                    <>
                      <Home className="w-3 h-3 inline-block" aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </Link>
              ) : (
                <span className={isLast ? current : baseLink}>
                  {i === 0 ? (
                    <>
                      <Home className="w-3 h-3 inline-block" aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
