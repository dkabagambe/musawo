import type { LucideIcon } from "lucide-react";

interface FeatureBlockProps {
  icon: LucideIcon;
  heading: string;
  body: string;
  accent?: boolean;
}

/**
 * Icon + heading + one or two lines of text.
 * Used in grids of 2, 3, or 4 columns.
 */
export default function FeatureBlock({
  icon: Icon,
  heading,
  body,
  accent = false,
}: FeatureBlockProps) {
  return (
    <div className="flex flex-col">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mb-4
          ${accent ? "bg-accent/15" : "bg-primary/10"}`}
      >
        <Icon
          className={`w-5 h-5 ${accent ? "text-accent" : "text-primary"}`}
          aria-hidden="true"
        />
      </div>
      <h3 className="font-bold text-primary text-base mb-2 leading-snug">{heading}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
    </div>
  );
}
