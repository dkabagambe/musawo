import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  trend?: { label: string; positive?: boolean };
  color?: "primary" | "success" | "warning" | "danger" | "accent";
}

const colorMap = {
  primary: { bg: "bg-primary/10", text: "text-primary", icon: "bg-primary/10 text-primary" },
  success: { bg: "bg-success/10", text: "text-success", icon: "bg-success/10 text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning", icon: "bg-warning/10 text-amber-700" },
  danger:  { bg: "bg-danger/10",  text: "text-danger",  icon: "bg-danger/10  text-danger"  },
  accent:  { bg: "bg-accent/10",  text: "text-accent",  icon: "bg-accent/10  text-accent"  },
};

export default function StatCard({ label, value, icon, href, trend, color = "primary" }: StatCardProps) {
  const c = colorMap[color];

  const inner = (
    <div className="bg-white rounded-2xl border border-border p-5 flex items-start gap-4
                    hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 leading-none">{label}</p>
        <p className={`text-2xl font-extrabold leading-tight ${c.text}`}>{value}</p>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend.positive !== false ? "text-success" : "text-danger"}`}>
            {trend.label}
          </p>
        )}
      </div>
      {href && (
        <span className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0 mt-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="no-underline block">{inner}</Link>;
  }
  return inner;
}
