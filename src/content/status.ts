import type { ArticleStatus } from "@/types/database";

// 원고 상태 표시 [한, 영]
export const STATUS_LABEL: Record<ArticleStatus, [string, string]> = {
  draft: ["초안", "draft"],
  in_review: ["검수 중", "in review"],
  approved: ["승인됨", "approved"],
};
