const REY_FARM_URL = "https://rey-farm.vercel.app";

/** 목록 하단 푸터: 데이터 출처 + 제작자 크레딧 + rey-farm 방문 유도 카드 */
export default function CreatorFooter() {
  return (
    <footer className="space-y-4 px-4 pt-6 text-[11px] leading-relaxed text-muted">
      <p>데이터: 서울미래유산, 서울시 오래가게 (내 손안에 서울). 업력은 올해 기준으로 계산해요.</p>

      <a
        href={REY_FARM_URL}
        target="_blank"
        rel="noopener"
        className="group flex items-center gap-3 rounded-2xl border border-line bg-background p-4 text-foreground transition-colors hover:border-accent"
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-lg">
          🌱
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">레이팜에서 다른 작업도 구경해 보세요</span>
          <span className="block text-xs text-muted">노포맵을 만든 레이.케이의 서비스 모음</span>
        </span>
        <span aria-hidden className="text-accent transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </a>

      <p className="text-center">
        Creative by{" "}
        <a
          href={REY_FARM_URL}
          target="_blank"
          rel="noopener"
          className="font-semibold text-foreground underline-offset-2 hover:text-accent hover:underline"
        >
          Rey.K
        </a>
      </p>
    </footer>
  );
}
