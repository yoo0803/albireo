// Supabase 스키마 타입
// 재생성: npm run db:types (supabase CLI)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// 분야: 기본값(content/fields) 또는 자유 입력
export type Discipline = string;
export type ArticleStatus = "draft" | "in_review" | "approved";
export type ReviewVerdict = "approve" | "request_changes";

type Table<R, I = Partial<R>, U = Partial<R>> = { Row: R; Insert: I; Update: U; Relationships: [] };

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  discipline: Discipline | null;
  role_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  links: Json;
  is_member: boolean;
  is_admin?: boolean;
  created_at: string;
  prefs: Json;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  discipline: Discipline;
  tags: string[];
  status: ArticleStatus;
  is_public: boolean;
  peer_reviewed: boolean;
  published_at: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  view_count: number;
  like_count: number;
  popularity: number;
  title_en: string | null;
  subtitle_en: string | null;
  excerpt_en: string | null;
  body_en: string | null;
  style: Json;
  notified_at: string | null;
  series_id: string | null;
  series_no: number | null;
};

// 연재 (serial) · 정기간행 (periodical)
export type SeriesKind = "serial" | "periodical";
export type SeriesCadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "irregular";
export type SeriesStatus = "ongoing" | "paused" | "completed";
export type Series = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  blurb: string | null;
  blurb_en: string | null;
  kind: SeriesKind;
  cadence: SeriesCadence;
  status: SeriesStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberRequest = {
  id: string;
  email: string;
  name: string;
  field: string | null;
  note: string | null;
  lang: "ko" | "en";
  token: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
  decided_at: string | null;
};

export type Subscriber = {
  id: string;
  email: string;
  lang: "ko" | "en";
  token: string;
  created_at: string;
  confirmed_at: string | null;
  confirm_sent_at: string | null;
  unsubscribed_at: string | null;
};

export type SiteVisit = {
  id: number;
  at: string;
  day: string;
  path: string;
  ref_host: string | null;
  country: string | null;
  device: "mobile" | "tablet" | "desktop" | null;
  visitor: string;
};

type Tally = { k: string; n: number; u?: number };
export type SiteStats = {
  visitors: number;
  views: number;
  today_visitors: number;
  today_views: number;
  daily: { day: string; visitors: number; views: number }[];
  pages: Tally[];
  refs: Tally[];
  countries: Tally[];
  devices: Tally[];
  subscribers: number;
};

export type ProfilePin = { profile_id: string; article_id: string; position: number };

export type ArticleAuthor = { article_id: string; profile_id: string; contribution: string | null };

export type Annotation = {
  id: string;
  article_id: string;
  sentence_id: string;
  start_offset: number;
  end_offset: number;
  quote: string;
  color: "gold" | "blue" | "rose" | "sage";
  resolved: boolean;
  author_id: string;
  created_at: string;
};

export type AnnotationReply = { id: string; annotation_id: string; body: string; author_id: string; created_at: string };

export type DebateTopic = {
  id: string;
  title: string;
  prompt: string | null;
  article_id: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
};

export type DebateComment = {
  id: string;
  topic_id: string;
  parent_id: string | null;
  lens: Discipline | null;
  body: string;
  author_id: string;
  created_at: string;
  deleted_at: string | null;
};

export type PeerReview = {
  article_id: string;
  reviewer_id: string;
  verdict: ReviewVerdict;
  checklist: Json;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Concept = { id: string; term: string; definition: string | null; created_by: string | null; created_at: string };
export type ConceptLink = { article_id: string; concept_id: string };

export type SrsCard = {
  id: string;
  user_id: string;
  concept_id: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  last_reviewed_at: string | null;
};

export type Canvas = { id: string; title: string; doc: Json; owner_id: string; updated_at: string; deleted_at: string | null; locked: boolean };
export type AppSettings = { id: boolean; required_reviews: number; max_members: number };

export type Database = {
  public: {
    Tables: {
      app_settings: Table<AppSettings>;
      profiles: Table<Profile, Pick<Profile, "id" | "handle" | "display_name"> & Partial<Profile>>;
      articles: Table<
        Article,
        Pick<Article, "slug" | "title" | "discipline" | "author_id"> & Partial<Article>
      >;
      article_authors: Table<ArticleAuthor, Pick<ArticleAuthor, "article_id" | "profile_id"> & Partial<ArticleAuthor>>;
      annotations: Table<
        Annotation,
        Pick<Annotation, "article_id" | "sentence_id" | "start_offset" | "end_offset" | "quote"> & Partial<Annotation>
      >;
      annotation_replies: Table<AnnotationReply, Pick<AnnotationReply, "annotation_id" | "body"> & Partial<AnnotationReply>>;
      debate_topics: Table<DebateTopic, Pick<DebateTopic, "title"> & Partial<DebateTopic>>;
      debate_comments: Table<DebateComment, Pick<DebateComment, "topic_id" | "body"> & Partial<DebateComment>>;
      peer_reviews: Table<PeerReview, Pick<PeerReview, "article_id" | "verdict"> & Partial<PeerReview>>;
      concepts: Table<Concept, Pick<Concept, "term"> & Partial<Concept>>;
      concept_links: Table<ConceptLink, ConceptLink>;
      srs_cards: Table<SrsCard, Pick<SrsCard, "user_id" | "concept_id"> & Partial<SrsCard>>;
      canvases: Table<Canvas, Partial<Canvas>>;
      profile_pins: Table<ProfilePin, ProfilePin>;
      subscribers: Table<Subscriber, Pick<Subscriber, "email"> & Partial<Subscriber>>;
      login_link_log: Table<{ id: number; at: string; who: string }, { who: string }>;
      member_requests: Table<MemberRequest, Pick<MemberRequest, "email" | "name"> & Partial<MemberRequest>>;
      series: Table<Series, Pick<Series, "slug" | "title"> & Partial<Series>>;
      site_visits: Table<SiteVisit, Omit<SiteVisit, "id" | "at" | "day"> & Partial<SiteVisit>>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_member: { Args: Record<string, never>; Returns: boolean };
      purge_expired_trash: { Args: Record<string, never>; Returns: number };
      member_email_exists: { Args: { e: string }; Returns: boolean };
      is_coauthor: { Args: { a: string }; Returns: boolean };
      public_reviewers: {
        Args: { a: string };
        Returns: { handle: string; display_name: string; discipline: Discipline | null; reviewed_at: string }[];
      };
      public_contributions: {
        Args: { h: string };
        Returns: { articles: number; coauthored: number; reviews: number; annotations: number; debate_comments: number }[];
      };
      backlinks: {
        Args: { a: string };
        Returns: { id: string; slug: string; title: string; shared_terms: string[] }[];
      };
      track_view: { Args: { a: string; v: string }; Returns: number | null };
      toggle_like: { Args: { a: string; v: string }; Returns: { liked: boolean; likes: number }[] };
      like_state: { Args: { a: string; v: string }; Returns: boolean };
      series_public: { Args: { s: string }; Returns: boolean };
      site_stats: { Args: { days: number }; Returns: SiteStats };
    };
    Enums: { article_status: ArticleStatus; review_verdict: ReviewVerdict };
    CompositeTypes: { [_ in never]: never };
  };
};
