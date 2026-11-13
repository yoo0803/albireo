"use client";
import { createContext, useContext, useMemo } from "react";
import { translator, type Lang, type T } from "./index";

const Ctx = createContext<Lang>("ko");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export function useT(): T {
  const lang = useLang();
  return useMemo(() => translator(lang), [lang]);
}
