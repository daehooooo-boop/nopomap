"use client";

import { useEffect, useRef, useState } from "react";
import { TIER_PIN_HEX, tierOf, type Store } from "@/lib/nopo";

/* eslint-disable @typescript-eslint/no-explicit-any -- 카카오 SDK는 타입 정의를 제공하지 않음 */
declare global {
  interface Window {
    kakao: any;
  }
}

// 환경 변수에 붙여 넣을 때 섞인 앞뒤 공백 제거
const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim();
const KOREA_CENTER = { lat: 36.35, lng: 127.8 };

let sdkPromise: Promise<any> | null = null;
function loadKakao(): Promise<any> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) return window.kakao.maps.load(() => resolve(window.kakao));
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KEY ?? "")}&autoload=false&libraries=clusterer`;
    s.async = true;
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("kakao sdk load failed"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function pinImage(kakao: any, color: string, selected: boolean) {
  const w = selected ? 34 : 26;
  const h = Math.round(w * 1.3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 26 34"><path d="M13 33s11-11.2 11-20A11 11 0 0 0 2 13c0 8.8 11 20 11 20z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="4" fill="#fff"/></svg>`;
  return new kakao.maps.MarkerImage(
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    new kakao.maps.Size(w, h),
    { offset: new kakao.maps.Point(w / 2, h) },
  );
}

type Props = {
  stores: Store[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 지역 필터가 바뀌면 결과 범위로 지도를 맞춤 */
  fitKey: string;
  /** 모바일에서 목록 ↔ 지도 전환 시 크기를 다시 계산하기 위함 */
  visible: boolean;
};

export default function KakaoMap({ stores, selectedId, onSelect, fitKey, visible }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const clusterer = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [state, setState] = useState<"loading" | "ready" | "nokey" | "error">(KEY ? "loading" : "nokey");
  const me = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);

  // 내 위치로 이동: 브라우저 위치 권한을 받아 파란 점을 찍고 동네 수준으로 확대
  const goToMyLocation = () => {
    if (state !== "ready") return;
    if (!navigator.geolocation) return setLocateMsg("이 브라우저는 위치 찾기를 지원하지 않아요.");
    setLocating(true);
    setLocateMsg(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const kakao = window.kakao;
        const pos = new kakao.maps.LatLng(coords.latitude, coords.longitude);
        const content =
          '<div style="width:18px;height:18px;border-radius:50%;background:#2f80ed;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,128,237,.25)"></div>';
        if (me.current) me.current.setPosition(pos);
        else me.current = new kakao.maps.CustomOverlay({ map: map.current, position: pos, content, zIndex: 20 });
        map.current.setLevel(5);
        map.current.panTo(pos);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateMsg(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 위치 접근을 허용해 주세요."
            : "현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    if (!locateMsg) return;
    const t = setTimeout(() => setLocateMsg(null), 4000);
    return () => clearTimeout(t);
  }, [locateMsg]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 지도 생성 (한 번)
  useEffect(() => {
    if (!KEY || !el.current) return;
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !el.current) return;
        map.current = new kakao.maps.Map(el.current, {
          center: new kakao.maps.LatLng(KOREA_CENTER.lat, KOREA_CENTER.lng),
          level: 12,
        });
        clusterer.current = new kakao.maps.MarkerClusterer({
          map: map.current,
          averageCenter: true,
          minLevel: 6,
          gridSize: 50,
          styles: [
            {
              width: "40px",
              height: "40px",
              background: "rgba(229, 57, 43, 0.88)",
              borderRadius: "20px",
              color: "#fff",
              textAlign: "center",
              fontWeight: "700",
              lineHeight: "40px",
              border: "2px solid #fff",
            },
          ],
        });
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // 핀 갱신
  useEffect(() => {
    if (state !== "ready") return;
    const kakao = window.kakao;
    clusterer.current.clear();
    markers.current.clear();
    const list = stores.map((s) => {
      const tier = tierOf(s) ?? 30;
      const m = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(s.lat, s.lng),
        image: pinImage(kakao, TIER_PIN_HEX[tier], s.id === selectedId),
        title: s.name,
        zIndex: s.id === selectedId ? 10 : tier,
      });
      kakao.maps.event.addListener(m, "click", () => onSelectRef.current(s.id));
      markers.current.set(s.id, m);
      return m;
    });
    clusterer.current.addMarkers(list);
  }, [state, stores, selectedId]);

  // 결과 범위로 맞추기
  useEffect(() => {
    if (state !== "ready" || stores.length === 0) return;
    const kakao = window.kakao;
    const bounds = new kakao.maps.LatLngBounds();
    stores.forEach((s) => bounds.extend(new kakao.maps.LatLng(s.lat, s.lng)));
    map.current.setBounds(bounds, 60, 40, 60, 40);
    // fitKey가 바뀔 때만 맞춤 (선택할 때마다 지도가 튀지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, fitKey]);

  useEffect(() => {
    if (state === "ready" && visible) map.current.relayout();
  }, [state, visible]);

  // 선택한 가게로 이동
  useEffect(() => {
    if (state !== "ready" || !selectedId) return;
    const s = stores.find((x) => x.id === selectedId);
    if (s) map.current.panTo(new window.kakao.maps.LatLng(s.lat, s.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, selectedId]);

  return (
    <div className="relative h-full w-full bg-line/40">
      <div ref={el} className="h-full w-full" />
      {state === "ready" && (
        <button
          type="button"
          onClick={goToMyLocation}
          aria-label="내 위치로 이동"
          title="내 위치로 이동"
          className="absolute right-4 bottom-[calc(20px+env(safe-area-inset-bottom))] z-10 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-foreground shadow-lg"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={locating ? "animate-pulse" : undefined}
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
      )}
      {locateMsg && (
        <p className="absolute top-3 left-1/2 z-10 w-[min(90%,360px)] -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-center text-xs text-background shadow-md">
          {locateMsg}
        </p>
      )}
      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
          {state === "loading" && "지도를 불러오는 중…"}
          {state === "nokey" && (
            <p>
              지도 키가 없어요. <code className="rounded bg-surface px-1">.env.local</code>에{" "}
              <code className="rounded bg-surface px-1">NEXT_PUBLIC_KAKAO_MAP_KEY</code>를 넣어 주세요.
              <br />
              목록 보기는 지금도 쓸 수 있어요.
            </p>
          )}
          {state === "error" && (
            <p>
              지도를 불러오지 못했어요. 카카오 개발자 콘솔의 플랫폼 키 → JavaScript SDK 도메인에
              <br />이 주소({typeof window !== "undefined" ? window.location.origin : ""})가 등록돼 있는지 확인해 주세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
