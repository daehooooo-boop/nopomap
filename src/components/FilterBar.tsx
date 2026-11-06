"use client";

import { STORES, TIERS, regionsOf, type TierFilter } from "@/lib/nopo";
import { useNopoStore } from "@/store/useNopoStore";
import { cn } from "@/lib/utils";

const REGIONS = regionsOf(STORES);

export default function FilterBar({ count }: { count: number }) {
  const { tier, sido, sigungu, setTier, setRegion } = useNopoStore();

  const chips: { value: TierFilter; label: string }[] = [
    { value: 0, label: "전체" },
    ...TIERS.map((t) => ({ value: t as TierFilter, label: `${t}년 이상` })),
  ];

  const summary = [sigungu ? `${sido?.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "")} ${sigungu}` : sido ?? "전국", tier ? `${tier}년 이상` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-surface px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-lg font-bold tracking-tight">
          노포맵<span className="sr-only"> 전국 노포 지도</span>
        </h1>
        <label className="sr-only" htmlFor="sido">
          시·도
        </label>
        <select
          id="sido"
          value={sido ?? ""}
          onChange={(e) => setRegion(e.target.value || null)}
          className="h-9 rounded-lg border border-line bg-background px-2 text-sm"
        >
          <option value="">전국</option>
          {Object.keys(REGIONS).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sigungu">
          시·군·구
        </label>
        <select
          id="sigungu"
          value={sigungu ?? ""}
          disabled={!sido}
          onChange={(e) => setRegion(sido, e.target.value || null)}
          className="h-9 rounded-lg border border-line bg-background px-2 text-sm disabled:opacity-50"
        >
          <option value="">전체</option>
          {(sido ? REGIONS[sido] : []).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div role="group" aria-label="업력" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
        {chips.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={tier === c.value}
            onClick={() => setTier(c.value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
              tier === c.value
                ? "border-foreground bg-foreground text-background"
                : "border-line bg-background text-foreground",
            )}
          >
            {c.value !== 0 && (
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: `var(--tier-${c.value})` }} />
            )}
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {summary} · <strong className="font-semibold text-foreground tabular-nums">{count}곳</strong>
      </p>
    </div>
  );
}
