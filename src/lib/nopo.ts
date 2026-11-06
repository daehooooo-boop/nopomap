import raw from "@/data/stores.json";

export type Designation = "백년가게" | "서울미래유산" | "오래가게";

export type Store = {
  id: string;
  name: string;
  openYear: number | null;
  sido: string;
  sigungu: string;
  address: string | null;
  lat: number;
  lng: number;
  /** exact: 카카오 장소 매칭, address: 주소 좌표만, approx-district: 자치구 중심 근사값 */
  coordPrecision: "exact" | "address" | "approx-district";
  category: string;
  categoryDetail?: string | null;
  /** 2022 백년가게 현황의 주요사업 (예: "냉면", "제과,제빵") */
  mainBusiness?: string | null;
  /** 2022 백년가게 현황 기준 연락처. 바뀌었을 수 있음 */
  phone?: string | null;
  signatureMenu: string[];
  story: string | null;
  naverPlaceUrl: string | null;
  kakaoPlaceUrl?: string | null;
  designations: Designation[];
  source: { name: string; url: string };
  status: "open" | "closed" | "moved" | "unknown";
};

export const STORES = (raw as { stores: Store[] }).stores;

/** 업력 단계. 0은 "전체" */
export const TIERS = [30, 50, 70, 100] as const;
export type Tier = (typeof TIERS)[number];
export type TierFilter = 0 | Tier;

/** 업력(년차) = 올해 - 개업연도 + 1. 개업연도를 모르면 null */
export function yearsInBusiness(openYear: number | null, now = new Date()): number | null {
  if (openYear == null) return null;
  return now.getFullYear() - openYear + 1;
}

/** 가게가 속하는 가장 높은 업력 단계. 백년가게처럼 연도를 모르면 30 (지정 조건이 30년 이상) */
export function tierOf(store: Store, now = new Date()): Tier | null {
  const y = yearsInBusiness(store.openYear, now);
  if (y == null) return store.designations.includes("백년가게") ? 30 : null;
  for (let i = TIERS.length - 1; i >= 0; i--) if (y >= TIERS[i]) return TIERS[i];
  return null;
}

export function matchesTier(store: Store, filter: TierFilter): boolean {
  if (filter === 0) return true;
  const t = tierOf(store);
  return t != null && t >= filter;
}

export const TIER_COLOR_VAR: Record<Tier, string> = {
  30: "var(--tier-30)",
  50: "var(--tier-50)",
  70: "var(--tier-70)",
  100: "var(--tier-100)",
};

/** 지도 핀은 CSS 변수를 못 쓰므로 고정 색 (라이트 기준) */
export const TIER_PIN_HEX: Record<Tier, string> = {
  30: "#c49a6c",
  50: "#a26a3c",
  70: "#7a4321",
  100: "#4a2412",
};

export function regionsOf(stores: Store[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const s of stores) (map[s.sido] ??= new Set()).add(s.sigungu);
  return Object.fromEntries(
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b, "ko"))
      .map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b, "ko"))]),
  );
}
