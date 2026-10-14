import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb { label: string; href?: string }

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-2" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" aria-hidden="true" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-primary no-underline transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-600 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-primary leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
