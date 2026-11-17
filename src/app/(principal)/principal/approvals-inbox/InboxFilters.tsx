"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Filter {
  label: string;
  value: string;
}

interface Props {
  typeFilters: Filter[];
  ageFilters: Filter[];
  currentType?: string;
  currentAge?: string;
}

export default function InboxFilters({ typeFilters, ageFilters, currentType, currentAge }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildHref = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const sp = new URLSearchParams();
      searchParams.forEach((v, k) => {
        if (!(k in overrides)) sp.set(k, v);
      });
      Object.entries(overrides).forEach(([k, v]) => {
        if (v) sp.set(k, v);
      });
      return `/principal/approvals-inbox?${sp.toString()}`;
    },
    [searchParams]
  );

  return (
    <div className="flex gap-3 mb-6 flex-wrap items-center">
      <div className="flex gap-2 items-center">
        <label className="text-xs font-semibold text-gray-500">Type:</label>
        <select
          value={currentType ?? ""}
          onChange={(e) =>
            router.push(buildHref({ type: e.target.value || undefined }))
          }
          className="select text-sm py-1"
        >
          {typeFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-xs font-semibold text-gray-500">Age:</label>
        <select
          value={currentAge ?? ""}
          onChange={(e) =>
            router.push(buildHref({ age: e.target.value || undefined }))
          }
          className="select text-sm py-1"
        >
          {ageFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
