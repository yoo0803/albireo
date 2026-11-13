"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

// 브라우저 싱글톤
export function supabaseBrowser() {
  client ??= createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
