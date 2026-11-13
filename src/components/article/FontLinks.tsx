import { fontById, fontCss } from "@/content/fonts";

// 선택 서체 CSS (head 로 호이스팅)
export function FontLinks({ id }: { id?: string }) {
  const f = fontById(id);
  return <>{fontCss(f).map((href) => <link key={href} rel="stylesheet" href={href} precedence="default" />)}</>;
}
