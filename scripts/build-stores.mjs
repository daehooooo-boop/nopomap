// 노포맵 데이터 빌드: 공공데이터(백년가게) + 기존 큐레이션(서울 41곳)을 합쳐 src/data/stores.json을 만듭니다.
//
// 사용법 (레포 폴더에서):
//   KAKAO_REST_KEY=xxxx node scripts/build-stores.mjs        # 지오코딩 + 빌드
//   node scripts/build-stores.mjs --offline                   # API 호출 없이 캐시만으로 빌드
//
// - KAKAO_REST_KEY는 카카오 개발자 콘솔 > 플랫폼 키 > REST API 키입니다.
// - 지오코딩 결과는 data/geocode-cache.json에 저장되어, 다시 실행해도 같은 가게는 API를 부르지 않습니다.
// - 좌표를 찾지 못한 가게는 data/geocode-report.json에 후보와 함께 남습니다. (지도에서는 빠집니다)
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const ROOT = new URL("../", import.meta.url);
const OFFLINE = process.argv.includes("--offline");
const KEY = process.env.KAKAO_REST_KEY?.trim();
if (!OFFLINE && !KEY) {
  console.error("KAKAO_REST_KEY 환경변수를 설정하거나 --offline으로 실행해 주세요.");
  process.exit(1);
}

const BAEKNYEON_CSV = "data/raw/baeknyeon_2026-08-20.csv";
const BAEKNYEON_2022_CSV = "data/raw/baeknyeon_2022-07-13.csv"; // 업종(주요사업)·연락처 보완용
const BAEKNYEON_SOURCE = {
  name: "전국 백년가게 지정리스트 (소상공인시장진흥공단, 2026-08-20)",
  url: "https://www.data.go.kr/data/15132695/fileData.do",
};

// 시·도 표기 통일 (공공데이터와 카카오 응답 모두 약칭·정식 명칭이 섞여 있음)
const SIDO = {
  서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시",
  광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시",
  경기: "경기도", 강원: "강원특별자치도", 강원도: "강원특별자치도", 충북: "충청북도", 충남: "충청남도",
  전북: "전북특별자치도", 전라북도: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도",
  제주: "제주특별자치도", 제주도: "제주특별자치도",
};
const normSido = (s) => SIDO[s] ?? s;

const read = async (p) => readFile(new URL(p, ROOT));
const readJson = async (p, fallback) => {
  try {
    return JSON.parse(await read(p));
  } catch {
    return fallback;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const compact = (s) => s.replace(/\s|\(.*?\)/g, "");

/** 아주 단순한 CSV 파서 (따옴표 안의 쉼표 지원) */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

async function kakao(path, params) {
  const url = `https://dapi.kakao.com${path}?` + new URLSearchParams(params);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`kakao ${res.status} ${await res.text()}`);
    return res.json();
  }
  throw new Error("kakao 429 (too many requests)");
}

const pickCategory = (d) =>
  d.category_group_code === "FD6" ? "음식점" : d.category_group_code === "CE7" ? "카페" : d.category_name?.split(" > ")[0] ?? null;

/** 주소 → 좌표·행정구역, 그 근처에서 상호명으로 장소(카테고리·카카오맵 링크)를 찾음 */
async function geocode(name, address) {
  const out = { status: "not_found", candidates: [] };
  // 1) 주소 검색 (건물명·층수 등 뒷부분은 떼고 재시도)
  const tries = [address, address.replace(/\s*\(.*$/, ""), address.split(" ").slice(0, 4).join(" ")];
  let addr = null;
  for (const q of [...new Set(tries)]) {
    const r = await kakao("/v2/local/search/address.json", { query: q, size: 1 });
    if (r.documents?.length) {
      addr = r.documents[0];
      break;
    }
    await sleep(60);
  }
  // 2) 상호명 검색: 주소를 찾았으면 반경 300m, 못 찾았으면 주소 앞부분 + 상호명
  const kw = addr
    ? await kakao("/v2/local/search/keyword.json", { query: name, x: addr.x, y: addr.y, radius: 300, sort: "distance", size: 5 })
    : await kakao("/v2/local/search/keyword.json", { query: `${address.split(" ").slice(0, 2).join(" ")} ${name}`, size: 5 });
  const core = compact(name);
  const place = kw.documents?.find((d) => {
    const p = compact(d.place_name);
    return p.includes(core) || core.includes(p);
  });
  out.candidates = (kw.documents ?? []).map((d) => `${d.place_name} | ${d.road_address_name || d.address_name}`);

  const base = place ?? addr;
  if (!base) return out;
  const region = addr?.address ?? addr?.road_address ?? null;
  const placeAddr = place ? (place.road_address_name || place.address_name) : null;
  const parts = (region ? [region.region_1depth_name, region.region_2depth_name] : placeAddr?.split(" ").slice(0, 2)) ?? [];
  return {
    status: place ? "ok" : "address_only",
    lat: Number(base.y),
    lng: Number(base.x),
    sido: normSido(parts[0] ?? ""),
    sigungu: parts[1] ?? "",
    address: placeAddr ?? addr?.road_address?.address_name ?? addr?.address_name ?? address,
    kakaoPlaceUrl: place?.place_url ?? null,
    kakaoCategory: place ? pickCategory(place) : null,
    kakaoCategoryDetail: place?.category_name ?? null,
    matched: place?.place_name ?? null,
    candidates: out.candidates,
  };
}

const hashId = (prefix, s) => `${prefix}-${createHash("sha1").update(s).digest("hex").slice(0, 8)}`;

// ---------------------------------------------------------------------------

const cache = await readJson("data/geocode-cache.json", {});
const seed = (await readJson("data/seed-stores.json", { stores: [] })).stores;

// 2022 현황: 업체명 + 시도 + 시군구로 매칭해 주요사업(대표 품목)과 연락처를 보완
const csv22 = parseCsv(new TextDecoder("euc-kr").decode(await read(BAEKNYEON_2022_CSV)));
const [h22, ...rows22] = csv22;
const regionKey = (sido, sigungu) => `${normSido(sido)}|${(sigungu ?? "").replace(/(시|군|구).*$/, "$1")}`;
const info22 = new Map();
for (const r of rows22) {
  const key = `${compact(r[h22.indexOf("업체명")])}|${regionKey(r[h22.indexOf("시도")], r[h22.indexOf("시군구")])}`;
  info22.set(key, { mainBusiness: r[h22.indexOf("주요사업")].trim(), phone: r[h22.indexOf("연락처")].trim() || null });
}
const find22 = (name, address) => {
  const t = address.split(" ");
  return info22.get(`${compact(name)}|${regionKey(t[0], t[1])}`) ?? null;
};
let matched22 = 0;

const csv = parseCsv(new TextDecoder("euc-kr").decode(await read(BAEKNYEON_CSV)));
const [header, ...rows] = csv;
const col = (n) => header.indexOf(n);
const baeknyeon = rows.map((r) => {
  const name = r[col("업체명")].trim();
  const address = r[col("업체주소")].replace(/\s+/g, " ").trim();
  const extra = find22(name, address);
  if (extra) matched22++;
  return { id: hashId("bn", `${name}|${address}`), name, address, extra };
});

let calls = 0;
async function resolve(id, name, address) {
  if (cache[id] && cache[id].status !== "error") return cache[id];
  if (OFFLINE) return null;
  try {
    cache[id] = await geocode(name, address);
  } catch (e) {
    cache[id] = { status: "error", error: String(e.message ?? e) };
  }
  if (++calls % 50 === 0) {
    console.log(`  ${calls}곳 처리…`);
    await writeFile(new URL("data/geocode-cache.json", ROOT), JSON.stringify(cache, null, 1));
  }
  await sleep(120);
  return cache[id];
}

const stores = [];
const report = [];

// 1) 기존 큐레이션(서울미래유산·오래가게) — 근사 좌표면 지오코딩으로 보정
for (const s of seed) {
  let g = null;
  if (s.coordPrecision !== "exact") g = await resolve(s.id, s.name, `${s.sido} ${s.sigungu}`);
  if (g && g.status === "ok") {
    Object.assign(s, { lat: g.lat, lng: g.lng, address: g.address, kakaoPlaceUrl: g.kakaoPlaceUrl, coordPrecision: "exact" });
  } else if (g) report.push({ id: s.id, name: s.name, status: g.status, candidates: g.candidates });
  stores.push(s);
}

// 2) 백년가게
for (const b of baeknyeon) {
  const g = await resolve(b.id, b.name, b.address);
  if (!g || !("lat" in g)) {
    report.push({ id: b.id, name: b.name, address: b.address, status: g?.status ?? "not_geocoded", candidates: g?.candidates });
    continue;
  }
  if (g.status !== "ok") report.push({ id: b.id, name: b.name, address: b.address, status: g.status, candidates: g.candidates });

  // 같은 가게가 기존 큐레이션에도 있으면 합침 (같은 시군구 + 상호명 일치)
  const dup = stores.find((s) => s.sigungu === g.sigungu && compact(s.name) === compact(b.name));
  if (dup) {
    if (!dup.designations.includes("백년가게")) dup.designations.push("백년가게");
    continue;
  }
  const category = g.kakaoCategory ?? "기타";
  const items = b.extra?.mainBusiness
    ? b.extra.mainBusiness.split(/[,·/]/).map((x) => x.trim()).filter(Boolean)
    : [];
  stores.push({
    id: b.id,
    name: b.name,
    openYear: null,
    sido: g.sido,
    sigungu: g.sigungu,
    address: g.address,
    lat: g.lat,
    lng: g.lng,
    coordPrecision: g.status === "ok" ? "exact" : "address",
    category,
    categoryDetail: g.kakaoCategoryDetail,
    // 2022 현황의 주요사업. 음식점이면 대표메뉴 초안으로 쓰고 어드민에서 다듬음
    mainBusiness: b.extra?.mainBusiness ?? null,
    signatureMenu: category === "음식점" ? items : [],
    phone: b.extra?.phone ?? null, // 2022년 기준이라 바뀌었을 수 있음
    story: null,
    naverPlaceUrl: null,
    kakaoPlaceUrl: g.kakaoPlaceUrl,
    designations: ["백년가게"],
    source: BAEKNYEON_SOURCE,
    status: "unknown",
  });
}

await writeFile(new URL("data/geocode-cache.json", ROOT), JSON.stringify(cache, null, 1));
await writeFile(new URL("data/geocode-report.json", ROOT), JSON.stringify(report, null, 2) + "\n");
await writeFile(
  new URL("src/data/stores.json", ROOT),
  JSON.stringify(
    {
      version: 2,
      generatedAt: new Date().toISOString().slice(0, 10),
      note: "scripts/build-stores.mjs로 생성. 직접 고치지 말고 data/ 아래 원본을 고친 뒤 다시 빌드하세요.",
      stores,
    },
    null,
    1,
  ) + "\n",
);

const byStatus = report.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
console.log(`완료: 지도에 ${stores.length}곳 (백년가게 ${baeknyeon.length}곳 중 ${stores.filter((s) => s.id.startsWith("bn-")).length}곳 + 기존 ${seed.length}곳)`);
console.log(`2022 현황과 매칭: ${matched22}/${baeknyeon.length}곳 (주요사업·연락처 보완)`);
console.log(`확인 필요: ${JSON.stringify(byStatus)} → data/geocode-report.json`);
