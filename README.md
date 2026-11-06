# 노포맵 (NopoMap)

30년, 50년, 70년, 100년을 지켜 온 전국의 노포를 지역과 업력으로 골라 지도와 목록으로 보는 웹 서비스입니다.

## 실행

```bash
cp .env.example .env.local   # NEXT_PUBLIC_KAKAO_MAP_KEY에 카카오 JavaScript 키 입력
npm install
npm run dev                  # http://localhost:3000
```

카카오 개발자 콘솔 → 앱 → 플랫폼 → Web에 `http://localhost:3000`과 배포 주소가 등록돼 있어야 지도가 뜹니다. 키가 없어도 목록 보기는 동작합니다.

## 구조

| 경로 | 내용 |
|---|---|
| `src/data/stores.json` | 1단계 샘플 데이터 (서울 41곳, 좌표는 자치구 중심 근사값) |
| `src/lib/nopo.ts` | 가게 타입, 업력 계산(`올해 - 개업연도 + 1`), 업력 단계(30·50·70·100년 이상) |
| `src/store/useNopoStore.ts` | Zustand 상태(업력·지역·정렬·지도/목록·선택), 필터 함수 |
| `src/components/KakaoMap.tsx` | 카카오맵 + 클러스터러, 업력 단계별 핀 색 |
| `src/components/FilterBar.tsx` | 시·도/시·군·구 선택, 업력 칩, 결과 수 |
| `src/components/StoreList.tsx` | 목록(오래된 순·이름순) |
| `src/components/StoreDetail.tsx` | 가게 상세 하단 시트 (shadcn Drawer 구조, vaul) |

기획서: 프로젝트 파일 `nopomap/노포맵_기획서.md`
