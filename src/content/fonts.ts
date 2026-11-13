// 본문 서체: SIL OFL 1.1 (상업 이용 가능). Pretendard 는 전역 로드
export type FontDef = { id: string; name: string; nameEn?: string; family: string; pkg?: string; weights: number[]; script: "ko" | "latin" };

const FS = (pkg: string, v: string) => `https://cdn.jsdelivr.net/npm/${pkg}@${v}`;

export const FONTS: FontDef[] = [
  { id: "pretendard", name: "Pretendard", family: "'Pretendard Variable', Pretendard, sans-serif", weights: [], script: "ko" },
  { id: "noto-serif-kr", name: "Noto Serif KR", family: "'Noto Serif KR', serif", pkg: FS("@fontsource/noto-serif-kr", "5.3.1"), weights: [400, 700], script: "ko" },
  { id: "noto-sans-kr", name: "Noto Sans KR", family: "'Noto Sans KR', sans-serif", pkg: FS("@fontsource/noto-sans-kr", "5.3.1"), weights: [400, 700], script: "ko" },
  { id: "nanum-myeongjo", name: "나눔명조", nameEn: "Nanum Myeongjo", family: "'Nanum Myeongjo', serif", pkg: FS("@fontsource/nanum-myeongjo", "5.3.0"), weights: [400, 700], script: "ko" },
  { id: "nanum-gothic", name: "나눔고딕", nameEn: "Nanum Gothic", family: "'Nanum Gothic', sans-serif", pkg: FS("@fontsource/nanum-gothic", "5.3.0"), weights: [400, 700], script: "ko" },
  { id: "gowun-batang", name: "고운바탕", nameEn: "Gowun Batang", family: "'Gowun Batang', serif", pkg: FS("@fontsource/gowun-batang", "5.3.0"), weights: [400, 700], script: "ko" },
  { id: "gowun-dodum", name: "고운돋움", nameEn: "Gowun Dodum", family: "'Gowun Dodum', sans-serif", pkg: FS("@fontsource/gowun-dodum", "5.3.0"), weights: [400], script: "ko" },
  { id: "ibm-plex-sans-kr", name: "IBM Plex Sans KR", family: "'IBM Plex Sans KR', sans-serif", pkg: FS("@fontsource/ibm-plex-sans-kr", "5.3.0"), weights: [400, 700], script: "ko" },
  { id: "gothic-a1", name: "Gothic A1", family: "'Gothic A1', sans-serif", pkg: FS("@fontsource/gothic-a1", "5.3.0"), weights: [400, 700], script: "ko" },
  { id: "song-myung", name: "송명", nameEn: "Song Myung", family: "'Song Myung', serif", pkg: FS("@fontsource/song-myung", "5.3.1"), weights: [400], script: "ko" },
  { id: "hahmlet", name: "함렛", nameEn: "Hahmlet", family: "'Hahmlet Variable', serif", pkg: FS("@fontsource-variable/hahmlet", "5.3.0"), weights: [0], script: "ko" },
  { id: "eb-garamond", name: "EB Garamond", family: "'EB Garamond', serif", pkg: FS("@fontsource/eb-garamond", "5.3.0"), weights: [400, 700], script: "latin" },
  { id: "source-serif-4", name: "Source Serif 4", family: "'Source Serif 4', serif", pkg: FS("@fontsource/source-serif-4", "5.3.1"), weights: [400, 700], script: "latin" },
  { id: "newsreader", name: "Newsreader", family: "'Newsreader', serif", pkg: FS("@fontsource/newsreader", "5.3.0"), weights: [400, 700], script: "latin" },
  { id: "libre-baskerville", name: "Libre Baskerville", family: "'Libre Baskerville', serif", pkg: FS("@fontsource/libre-baskerville", "5.3.0"), weights: [400, 700], script: "latin" },
  { id: "inter", name: "Inter", family: "'Inter', sans-serif", pkg: FS("@fontsource/inter", "5.3.0"), weights: [400, 700], script: "latin" },
];

export const fontById = (id?: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

// 서체 CSS 경로 (0 = 가변 index)
export const fontCss = (f: FontDef) => (f.pkg ? f.weights.map((w) => `${f.pkg}/${w === 0 ? "index" : w}.css`) : []);
