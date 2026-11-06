"use client";

import { tierOf, yearsInBusiness, type Store } from "@/lib/nopo";
import { useNopoStore } from "@/store/useNopoStore";

export default function StoreList({ stores }: { stores: Store[] }) {
  const { sort, setSort, select, tier, setTier, setRegion } = useNopoStore();

  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted">
        <p>조건에 맞는 노포가 없어요.</p>
        <div className="flex gap-2">
          {tier !== 0 && (
            <button type="button" onClick={() => setTier(0)} className="rounded-full border border-line px-3 py-1.5 text-foreground">
              업력 조건 풀기
            </button>
          )}
          <button type="button" onClick={() => setRegion(null)} className="rounded-full border border-line px-3 py-1.5 text-foreground">
            전국으로 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-end gap-3 px-4 py-2 text-xs">
        {(
          [
            ["oldest", "오래된 순"],
            ["name", "이름순"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={sort === k}
            onClick={() => setSort(k)}
            className={sort === k ? "font-semibold text-foreground" : "text-muted"}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {stores.map((s) => {
          const y = yearsInBusiness(s.openYear);
          const t = tierOf(s) ?? 30;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => select(s.id)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-background focus-visible:bg-background focus-visible:outline-none"
              >
                <span className="flex w-14 shrink-0 flex-col items-center">
                  <span className="text-2xl font-bold leading-none tabular-nums" style={{ color: `var(--tier-${t}-ink)` }}>
                    {y ?? "30+"}
                  </span>
                  <span className="mt-1 text-[11px] text-muted">{y ? "년째" : "년 이상"}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {s.signatureMenu.join(", ") || s.mainBusiness || s.category} · {s.sigungu}
                    {s.openYear && ` · ${s.openYear}년 개업`}
                  </span>
                </span>
                <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">{s.designations[0]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
