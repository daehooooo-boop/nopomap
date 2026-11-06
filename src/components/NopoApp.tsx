"use client";

import dynamic from "next/dynamic";
import FilterBar from "@/components/FilterBar";
import StoreList from "@/components/StoreList";
import StoreDetail from "@/components/StoreDetail";
import { useFilteredStores, useNopoStore } from "@/store/useNopoStore";
import { cn } from "@/lib/utils";

const KakaoMap = dynamic(() => import("@/components/KakaoMap"), { ssr: false });

export default function NopoApp() {
  const stores = useFilteredStores();
  const { view, setView, selectedId, select, sido, sigungu, tier } = useNopoStore();

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      {/* 데스크톱: 왼쪽 패널(필터 + 목록) / 모바일: 위 필터 + 지도 또는 목록 */}
      <aside className="flex min-h-0 flex-col md:w-[400px] md:shrink-0 md:border-r md:border-line">
        <FilterBar count={stores.length} />
        <div className={cn("min-h-0 flex-1 overflow-y-auto bg-surface pb-24 md:block md:pb-6", view === "list" ? "block" : "hidden")}>
          <StoreList stores={stores} />
          <footer className="px-4 pt-6 text-[11px] leading-relaxed text-muted">
            데이터: 서울미래유산, 서울시 오래가게 (내 손안에 서울). 업력은 올해 기준으로 계산해요.
          </footer>
        </div>
      </aside>

      <main className={cn("relative min-h-0 flex-1", view === "map" ? "block" : "hidden md:block")}>
        <KakaoMap stores={stores} selectedId={selectedId} onSelect={select} fitKey={`${sido}|${sigungu}|${tier}`} visible={view === "map"} />
      </main>

      {/* 모바일 전환 버튼 (네이버 지도 방식) */}
      <button
        type="button"
        onClick={() => setView(view === "map" ? "list" : "map")}
        className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-30 h-11 -translate-x-1/2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg md:hidden"
      >
        {view === "map" ? `목록 보기 (${stores.length})` : "지도 보기"}
      </button>

      <StoreDetail />
    </div>
  );
}
