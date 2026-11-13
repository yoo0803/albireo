# Credits

Albireo — designed & developed by **Yeji C.**

본 프로젝트가 사용 · 참고한 서드파티 저작물 목록. 각 원저작자의 라이선스를 따른다.
사이트 내 `/credits` 페이지(`src/content/credits.ts`)와 동기 유지.

## 코드 (직접 사용)

| 프로젝트 | 저작자 | 라이선스 | 사용 범위 |
|---|---|---|---|
| [ascii-magic-art](https://github.com/kailashsr38/ascii-magic-art) v1.0.2 | ASCII Magic (ascii-magic.com), GitHub `kailashsr38` | MIT | npm 의존성. `pieces/` 조각(binary-stars, neural-forward-pass, bohr-atom-photon, pixel-paint-program, constellation-word — 5종)과 `runtime/player.js` 를 그대로 import. 소스 수정 없음. 래퍼: `src/components/ascii/AsciiPiece.tsx`. 멤버 이니셜 조각(`src/components/ascii/initials/`)은 `lib/kit.js` 의 `Grid` · `palette` 위 자체 제작. 메일 머리 그림 `public/mail/albireo-lens.png` 은 binary-stars 조각의 한 프레임을 캡처한 정지 이미지 |
| [Next.js](https://github.com/vercel/next.js) | Vercel | MIT | 프레임워크, `next/og` |
| [supabase-js](https://github.com/supabase/supabase-js) · [@supabase/ssr](https://github.com/supabase/ssr) | Supabase | MIT | DB · Auth · Realtime · Storage 클라이언트 |
| [Recharts](https://github.com/recharts/recharts) | Recharts Group | MIT | CSV 차트 · 원고 차트 (막대 · 선 · 면적 · 원형) |
| [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | Steve Ruiz | MIT | 캔버스 펜 필기 획 |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Naptha | Apache-2.0 | 필기 → 글자 인식 (언어 데이터는 실행 시 내려받음) |
| [Papa Parse](https://github.com/mholt/PapaParse) | Matt Holt | MIT | CSV 파싱 |
| [Nodemailer](https://github.com/nodemailer/nodemailer) | Andris Reinman | MIT-0 | 구독 메일 발송 |
| [Sentry JavaScript SDK](https://github.com/getsentry/sentry-javascript) | Sentry | MIT | 에러 모니터링 |
| [@next/third-parties](https://github.com/vercel/next.js/tree/canary/packages/third-parties) | Vercel | MIT | GA4 로더 |

> ascii-magic-art NOTICE: `pieces/ocean-sunset.js`, `pieces/starry-ridge.js` 는 Unsplash License 사진 기반. **본 프로젝트는 두 조각을 사용하지 않음.**

## 폰트 (Google Fonts `next/font` 셀프 호스팅 + Pretendard CDN)

| 폰트 | 저작자 | 라이선스 |
|---|---|---|
| [Pretendard](https://github.com/orioncactus/pretendard) | Kil Hyung-jin (orioncactus) | SIL OFL 1.1 |
| [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | Instrument | SIL OFL 1.1 |
| [Diphylleia](https://fonts.google.com/specimen/Diphylleia) | Google Fonts 표기 참조 | SIL OFL 1.1 |
| [Hahmlet](https://fonts.google.com/specimen/Hahmlet) | Hypertype | SIL OFL 1.1 |
| [Orbit](https://fonts.google.com/specimen/Orbit) | Google Fonts 표기 참조 | SIL OFL 1.1 |
| JetBrains Mono | JetBrains | SIL OFL 1.1 |
| [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda) | Owen Earl (indestructible type*) | SIL OFL 1.1 (브랜드 강조) |
| [Noto Serif KR](https://fonts.google.com/noto/specimen/Noto+Serif+KR) | Google · Adobe | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR) | Google · Adobe | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Nanum Myeongjo · Nanum Gothic](https://hangeul.naver.com/font) | Naver (Sandoll) | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Gowun Batang · Gowun Dodum](https://fonts.google.com/specimen/Gowun+Batang) | Yanghee Ryu | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [IBM Plex Sans KR](https://github.com/IBM/plex) | IBM | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Gothic A1](https://fonts.google.com/specimen/Gothic+A1) | HanYang I&C | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Song Myung](https://fonts.google.com/specimen/Song+Myung) | JIKJI SOFT | SIL OFL 1.1 (소개 · 구독 완료 제목, 원고 서체 선택 · Fontsource via jsDelivr) |
| [EB Garamond](https://fonts.google.com/specimen/EB+Garamond) | Georg Duffner, Octavio Pardo | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Source Serif 4](https://github.com/adobe-fonts/source-serif) | Adobe | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Newsreader](https://fonts.google.com/specimen/Newsreader) | Production Type | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville) | Impallari Type | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |
| [Inter](https://github.com/rsms/inter) | Rasmus Andersson | SIL OFL 1.1 (원고 서체 선택, Fontsource via jsDelivr) |

## Claude Code로 만든 작업

| 작업 | 파일 | 설명 |
|---|---|---|
| 멤버 프로필 애니메이션 | `src/components/ascii/initials/` | ascii-magic-art `Grid` · `palette` 키트로 만든 멤버 이니셜 ASCII 애니메이션 |
| 메인 화면 애니메이션 | `src/components/orbit/OrbitHero.tsx` | 첫 화면의 궤도 그림과 움직임 |
| 소개 · 구독 완료 애니메이션 | `src/components/art/AlbireoScope.tsx` | 망원경으로 알비레오를 들여다보는 점묘 그림 |
| 샘플 표지 | `src/components/art/Cover.tsx` · `CoverArt.tsx` | 글마다 자동으로 그려지는 표지 틀과 예시 표지 |
| 작업실 소개 영상 | `src/components/promo/StudioPromo.tsx` | 로그인 화면에서 재생되는 작업실 기능 소개 |

## 데이터 소스

| 항목 | 출처 |
|---|---|
| DOI 메타데이터 | doi.org 콘텐츠 협상 (Crossref · DataCite CSL-JSON) |
| YL 이니셜 애니메이션 글자 | Homer, *The Iliad* 1권 첫머리, Samuel Butler 영역 (1898) · 퍼블릭 도메인 · [Project Gutenberg #2199](https://www.gutenberg.org/ebooks/2199) |
| 알비레오 관측값 (소개 페이지 · 망원경 그림) | 각거리 · 위치각 · 등급 · 분광형 · Aa–Ac 궤도: [Wikipedia: Albireo](https://en.wikipedia.org/wiki/Albireo) 정리값 · 거리: ESA Gaia · A–B 관계: Drimmel et al. 2021, *MNRAS* 502, 328 |

## 알고리즘 · 개념

| 항목 | 출처 |
|---|---|
| APA 7th 참고문헌 형식 | American Psychological Association, Publication Manual (7th ed.) |
| FNV-1a 해시 | Glenn Fowler, Landon Curt Noll, Kiem-Phong Vo (public domain) |
| mulberry32 PRNG | Tommy Ettinger (public domain) |

## 디자인 모티프

| 항목 | 출처 |
|---|---|
| 렌즈 링 문구 '天象列次' | 천상열차분야지도(1395, 조선) 제목 인용 |
| 문살 격자 · 낙관 · 세로쓰기 · 갖은자 | 한국 전통 시각 요소, 독자 재해석 |

## 데이터

- 데모 아티클은 자리표시 텍스트(Sample Text).
