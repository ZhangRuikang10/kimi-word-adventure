import { openDB, type DBSchema } from "idb";
import type { AnalyticsEvent, AttemptEvent, ConceptProgress, SessionRecord } from "../types/learning";

interface WordAdventureDb extends DBSchema { progress: { key: string; value: ConceptProgress }; attempts: { key: string; value: AttemptEvent; indexes: { "by-concept": string; "by-session": string } }; sessions: { key: string; value: SessionRecord }; analytics: { key: string; value: AnalyticsEvent }; }
export const DB_NAME = "kimi-word-adventure"; export const DB_VERSION = 1;
export function getDatabase() { return openDB<WordAdventureDb>(DB_NAME, DB_VERSION, { upgrade(db) { if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "conceptId" }); if (!db.objectStoreNames.contains("attempts")) { const store = db.createObjectStore("attempts", { keyPath: "id" }); store.createIndex("by-concept", "conceptId"); store.createIndex("by-session", "sessionId"); } if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" }); if (!db.objectStoreNames.contains("analytics")) db.createObjectStore("analytics", { keyPath: "id" }); } }); }
