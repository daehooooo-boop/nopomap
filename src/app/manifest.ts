import type { MetadataRoute } from "next";

// 폰 홈 화면·PC 바로가기에 추가했을 때의 이름과 아이콘
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "노포맵 · 전국 노포 지도",
    short_name: "노포맵",
    description: "30년, 50년, 70년, 100년을 지켜 온 전국의 노포를 지도와 목록으로 찾아보세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#FF0202",
    theme_color: "#faf7f2",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
