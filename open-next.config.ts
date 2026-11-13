import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// 미리 만든 페이지는 정적 자산에서 읽기 (R2 없이 무료 플랜으로)
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
