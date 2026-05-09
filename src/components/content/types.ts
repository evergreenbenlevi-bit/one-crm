export interface ContentPiece {
  id: string;
  title: string;
  hook: string | null;
  angle: string | null;
  format: "reel" | "carousel" | "post" | "story" | null;
  platform: "instagram" | "youtube" | "both" | null;
  pillar: string | null;
  status: ContentStatus;
  film_date: string | null;
  publish_date: string | null;
  script: string | null;
  reference_urls: string[];
  views: number;
  saves: number;
  shares: number;
  comments: number;
  viral_score: number;
  created_at: string;
  updated_at: string;
}

export type ContentStatus =
  | "idea"
  | "scripting"
  | "ready_to_film"
  | "filmed"
  | "editing"
  | "live"
  | "analyzing";

export const CONTENT_STATUSES: ContentStatus[] = [
  "idea",
  "scripting",
  "ready_to_film",
  "filmed",
  "editing",
  "live",
  "analyzing",
];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  scripting: "Scripting",
  ready_to_film: "Ready to Film",
  filmed: "Filmed",
  editing: "Editing",
  live: "Live",
  analyzing: "Analyzing",
};

export const STATUS_COLORS: Record<ContentStatus, string> = {
  idea: "text-gray-400 bg-gray-800 border-gray-700",
  scripting: "text-blue-400 bg-blue-950 border-blue-800",
  ready_to_film: "text-amber-400 bg-amber-950 border-amber-800",
  filmed: "text-purple-400 bg-purple-950 border-purple-800",
  editing: "text-orange-400 bg-orange-950 border-orange-800",
  live: "text-emerald-400 bg-emerald-950 border-emerald-800",
  analyzing: "text-pink-400 bg-pink-950 border-pink-800",
};

export const STATUS_DOT: Record<ContentStatus, string> = {
  idea: "bg-gray-500",
  scripting: "bg-blue-500",
  ready_to_film: "bg-amber-500",
  filmed: "bg-purple-500",
  editing: "bg-orange-500",
  live: "bg-emerald-500",
  analyzing: "bg-pink-500",
};

export const FORMAT_COLORS: Record<string, string> = {
  reel: "text-red-400 bg-red-950 border-red-900",
  carousel: "text-blue-400 bg-blue-950 border-blue-900",
  post: "text-gray-400 bg-gray-800 border-gray-700",
  story: "text-purple-400 bg-purple-950 border-purple-900",
};

export const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  carousel: "Carousel",
  post: "Post",
  story: "Story",
};

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "IG",
  youtube: "YT",
  both: "IG+YT",
};

export type ContentFormat = "reel" | "carousel" | "post" | "story";
export type ContentPlatform = "instagram" | "youtube" | "both";

export const FORMAT_OPTIONS: ContentFormat[] = ["reel", "carousel", "post", "story"];
export const PLATFORM_OPTIONS: ContentPlatform[] = ["instagram", "youtube", "both"];

export type SortField = "viral_score" | "views" | "saves" | "publish_date" | "created_at";

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "created_at", label: "Date Added" },
  { value: "publish_date", label: "Publish Date" },
  { value: "viral_score", label: "Viral Score" },
  { value: "views", label: "Views" },
  { value: "saves", label: "Saves" },
];
