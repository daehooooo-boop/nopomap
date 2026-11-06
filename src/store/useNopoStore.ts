import { useMemo } from "react";
import { create } from "zustand";
import { STORES, matchesTier, yearsInBusiness, type Store, type TierFilter } from "@/lib/nopo";

export type SortKey = "oldest" | "name";
export type View = "map" | "list";

type State = {
  tier: TierFilter;
  sido: string | null;
  sigungu: string | null;
  sort: SortKey;
  view: View;
  selectedId: string | null;
  setTier: (t: TierFilter) => void;
  setRegion: (sido: string | null, sigungu?: string | null) => void;
  setSort: (s: SortKey) => void;
  setView: (v: View) => void;
  select: (id: string | null) => void;
};

export const useNopoStore = create<State>((set) => ({
  tier: 0,
  sido: null,
  sigungu: null,
  sort: "oldest",
  view: "map",
  selectedId: null,
  setTier: (tier) => set({ tier }),
  setRegion: (sido, sigungu = null) => set({ sido, sigungu }),
  setSort: (sort) => set({ sort }),
  setView: (view) => set({ view }),
  select: (selectedId) => set({ selectedId }),
}));

export function filterStores(
  stores: Store[],
  { tier, sido, sigungu, sort }: Pick<State, "tier" | "sido" | "sigungu" | "sort">,
): Store[] {
  const out = stores.filter(
    (s) =>
      s.status !== "closed" &&
      matchesTier(s, tier) &&
      (!sido || s.sido === sido) &&
      (!sigungu || s.sigungu === sigungu),
  );
  return out.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "ko");
    const ya = yearsInBusiness(a.openYear) ?? -1;
    const yb = yearsInBusiness(b.openYear) ?? -1;
    return yb - ya || a.name.localeCompare(b.name, "ko");
  });
}

/** 필터가 적용된 가게 목록. 지도와 목록이 같은 결과를 씀 */
export function useFilteredStores(): Store[] {
  const tier = useNopoStore((s) => s.tier);
  const sido = useNopoStore((s) => s.sido);
  const sigungu = useNopoStore((s) => s.sigungu);
  const sort = useNopoStore((s) => s.sort);
  return useMemo(() => filterStores(STORES, { tier, sido, sigungu, sort }), [tier, sido, sigungu, sort]);
}
