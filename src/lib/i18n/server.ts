import "server-only";
import { cookies, headers } from "next/headers";
import { fromAcceptLanguage, isLang, translator, LANG_COOKIE, type Lang, type T } from "./index";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  return fromAcceptLanguage((await headers()).get("accept-language"));
}

export async function getT(): Promise<T> {
  return translator(await getLang());
}
