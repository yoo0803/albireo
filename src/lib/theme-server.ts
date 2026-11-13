import "server-only";
import { cookies } from "next/headers";
import { THEME_COOKIE, isFixedTheme, type Theme } from "./theme";

// 저장된 테마 (없으면 시스템)
export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return isFixedTheme(v) ? v : "system";
}
