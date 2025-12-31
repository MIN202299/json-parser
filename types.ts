export type JsonValue = string | number | boolean | null | JsonArray | JsonObject;

export interface JsonArray extends Array<JsonValue> {}

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ParseResult {
  valid: boolean;
  data: JsonValue | null;
  error: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  content: string;
}

export interface RecursiveConfig {
  enabled: boolean;
  maxDepth: number;
}

export type ViewMode = 'tree' | 'code';
export type AiAction = 'fix' | 'types' | 'idle';