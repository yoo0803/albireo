// 피어 리뷰 가이드라인
export const REVIEW_CHECKLIST = [
  { id: "claim", label: "주장 명확성", desc: "핵심 주장이 첫 두 문단 안에 드러난다", labelEn: "Clear claim", descEn: "The core claim appears within the first two paragraphs" },
  { id: "source", label: "출처 검증", desc: "수치 · 인용 · 법령에 1차 출처가 있다", labelEn: "Sources", descEn: "Figures, quotes and laws cite primary sources" },
  { id: "data", label: "데이터 정합성", desc: "차트와 본문 수치가 일치하고 단위가 명시된다", labelEn: "Data integrity", descEn: "Charts match the text and units are stated" },
  { id: "lens", label: "타 전공 가독성", desc: "비전공 멤버가 용어 설명 없이 막히지 않는다", labelEn: "Cross-field clarity", descEn: "Readable for members outside the field" },
  { id: "language", label: "문장 · 표기", desc: "맞춤법, 외래어 표기, 문장 길이 기준 충족", labelEn: "Language", descEn: "Spelling, transliteration and sentence length" },
  { id: "ethics", label: "윤리 · 저작권", desc: "이미지 · 데이터 라이선스와 크레딧이 표기된다", labelEn: "Ethics · rights", descEn: "Image and data licences are credited" },
] as const;

export type ChecklistId = (typeof REVIEW_CHECKLIST)[number]["id"];
