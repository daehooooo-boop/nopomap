"use client";

import { STORES, tierOf, yearsInBusiness } from "@/lib/nopo";
import { useNopoStore } from "@/store/useNopoStore";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

export default function StoreDetail() {
  const { selectedId, select } = useNopoStore();
  const store = STORES.find((s) => s.id === selectedId) ?? null;
  const y = store ? yearsInBusiness(store.openYear) : null;
  const t = store ? (tierOf(store) ?? 30) : 30;
  const mapUrl = store
    ? store.kakaoPlaceUrl ?? `https://map.kakao.com/?q=${encodeURIComponent(`${store.sigungu} ${store.name}`)}`
    : "#";
  const naverUrl = store
    ? store.naverPlaceUrl ?? `https://map.naver.com/p/search/${encodeURIComponent(`${store.sigungu} ${store.name}`)}`
    : "#";

  return (
    <Drawer open={!!store} onOpenChange={(o) => !o && select(null)}>
      <DrawerContent>
        {store && (
          <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-6 pt-4">
            <header className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1.5">
                {store.designations.map((d) => (
                  <span key={d} className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">
                    {d}
                  </span>
                ))}
              </div>
              <DrawerTitle className="text-2xl font-bold tracking-tight">{store.name}</DrawerTitle>
              <DrawerDescription className="text-sm text-muted">
                {store.sido} {store.sigungu} · {store.category}
              </DrawerDescription>
            </header>

            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background p-3">
                <dt className="text-xs text-muted">업력</dt>
                <dd className="text-2xl font-bold tabular-nums" style={{ color: `var(--tier-${t})` }}>
                  {y ? `${y}년차` : "30년 이상"}
                </dd>
              </div>
              <div className="rounded-xl bg-background p-3">
                <dt className="text-xs text-muted">개업연도</dt>
                <dd className="text-2xl font-bold tabular-nums">{store.openYear ? `${store.openYear}년` : "확인 중"}</dd>
              </div>
            </dl>

            <section className="flex flex-col gap-1">
              <h3 className="text-xs text-muted">대표메뉴</h3>
              <p className="font-medium">{store.signatureMenu.join(", ") || "확인 중"}</p>
            </section>

            <section className="flex flex-col gap-1">
              <h3 className="text-xs text-muted">한줄 스토리</h3>
              <p className={store.story ? "" : "text-muted"}>{store.story ?? "아직 정리 중이에요."}</p>
            </section>

            <section className="flex flex-col gap-1 text-sm">
              <h3 className="text-xs text-muted">주소</h3>
              <p>{store.address ?? `${store.sido} ${store.sigungu} (정확한 주소 확인 중)`}</p>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <a href={mapUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background">
                카카오맵에서 보기
              </a>
              <a href={naverUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl border border-line text-sm font-semibold">
                네이버 지도에서 보기
              </a>
            </div>

            <p className="text-xs text-muted">
              출처:{" "}
              <a href={store.source.url} target="_blank" rel="noreferrer" className="underline">
                {store.source.name}
              </a>
              {store.status === "unknown" && " · 현재 영업 여부는 확인 중이에요."}
            </p>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
