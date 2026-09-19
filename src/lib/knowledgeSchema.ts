// =================================================================
// knowledgeSchema.ts — Trading Knowledge の Zod バリデーション
// =================================================================

import { z } from "zod";

export const KNOWLEDGE_CATEGORIES = [
  "Market Structure",
  "Trend Analysis",
  "Price Action",
  "Indicators",
  "Risk Management",
  "Session",
  "News & Events",
  "Psychology",
  "General",
] as const;

export const KNOWLEDGE_MARKETS = [
  "GOLD", "USDJPY", "EURUSD", "GBPUSD", "AUDUSD",
  "EURJPY", "GBPJPY", "SILVER", "US30", "US500",
] as const;

export const KNOWLEDGE_TIMEFRAMES = [
  "M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1",
] as const;

export const KNOWLEDGE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const KNOWLEDGE_SOURCE_TYPES = ["MANUAL", "URL", "AI_GENERATED"] as const;

export const TradingKnowledgeSchema = z.object({
  title:       z.string().min(2).max(100),
  category:    z.string().min(1).max(50),
  summary:     z.string().max(500).optional(),
  content:     z.string().max(50000).default(""),
  ai_usage:    z.string().max(300).optional(),
  market:      z.array(z.string()).min(1).default(["GOLD"]),
  timeframes:  z.array(z.string()).default([]),
  tags:        z.array(z.string().max(30)).max(20).default([]),
  source_type: z.enum(KNOWLEDGE_SOURCE_TYPES).default("MANUAL"),
  source_url:  z.string().url().optional().or(z.literal("").transform(() => undefined)),
  status:      z.enum(KNOWLEDGE_STATUSES).default("DRAFT"),
  editor_note: z.string().max(200).optional(),
});

export const TradingKnowledgeUpdateSchema = TradingKnowledgeSchema.partial();

export type TradingKnowledgeInput = z.infer<typeof TradingKnowledgeSchema>;

export interface TradingKnowledge {
  id:          string;
  title:       string;
  category:    string;
  summary:     string | null;
  content:     string;
  ai_usage:    string | null;
  market:      string[];
  timeframes:  string[];
  tags:        string[];
  source_type: string;
  source_url:  string | null;
  status:      "DRAFT" | "ACTIVE" | "ARCHIVED";
  version:     number;
  editor_note: string | null;
  created_at:  string;
  updated_at:  string;
}
