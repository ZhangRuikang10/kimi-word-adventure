import type { AnalyticsEvent, AttemptEvent, BackupPayload, ConceptProgress, SessionRecord } from "../types/learning";
import { DB_VERSION, getDatabase } from "./db";

export interface ProgressRepository {
  getConceptProgress(id: string): Promise<ConceptProgress | undefined>; saveConceptProgress(progress: ConceptProgress): Promise<void>; getAllConceptProgress(): Promise<ConceptProgress[]>;
  addAttempt(event: AttemptEvent): Promise<void>; getAttempts(): Promise<AttemptEvent[]>; getDueConcepts(date: Date): Promise<ConceptProgress[]>;
  saveSession(session: SessionRecord): Promise<void>; getSessions(): Promise<SessionRecord[]>; addAnalytics(event: AnalyticsEvent): Promise<void>; getAnalytics(): Promise<AnalyticsEvent[]>;
  exportBackup(): Promise<BackupPayload>; importBackup(payload: BackupPayload): Promise<void>;
}
export class IndexedDbProgressRepository implements ProgressRepository {
  async getConceptProgress(id: string) { return (await getDatabase()).get("progress", id); }
  async saveConceptProgress(progress: ConceptProgress) { await (await getDatabase()).put("progress", progress); }
  async getAllConceptProgress() { return (await getDatabase()).getAll("progress"); }
  async addAttempt(event: AttemptEvent) { await (await getDatabase()).put("attempts", event); }
  async getAttempts() { return (await getDatabase()).getAll("attempts"); }
  async getDueConcepts(date: Date) { return (await this.getAllConceptProgress()).filter((item) => item.nextReviewAt && Date.parse(item.nextReviewAt) <= date.getTime()); }
  async saveSession(session: SessionRecord) { await (await getDatabase()).put("sessions", session); }
  async getSessions() { return (await getDatabase()).getAll("sessions"); }
  async addAnalytics(event: AnalyticsEvent) { await (await getDatabase()).put("analytics", event); }
  async getAnalytics() { return (await getDatabase()).getAll("analytics"); }
  async exportBackup(): Promise<BackupPayload> { return { schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(), progresses: await this.getAllConceptProgress(), attempts: await this.getAttempts(), sessions: await this.getSessions(), analytics: await this.getAnalytics() }; }
  async importBackup(payload: BackupPayload): Promise<void> { validateBackup(payload); const db = await getDatabase(); const tx = db.transaction(["progress","attempts","sessions","analytics"], "readwrite"); await Promise.all([tx.objectStore("progress").clear(),tx.objectStore("attempts").clear(),tx.objectStore("sessions").clear(),tx.objectStore("analytics").clear()]); await Promise.all(payload.progresses.map((item) => tx.objectStore("progress").put(item))); await Promise.all(payload.attempts.map((item) => tx.objectStore("attempts").put(item))); await Promise.all(payload.sessions.map((item) => tx.objectStore("sessions").put(item))); await Promise.all(payload.analytics.map((item) => tx.objectStore("analytics").put(item))); await tx.objectStore("analytics").put({ id: `backup-imported-${Date.now()}`, type: "backup_imported", createdAt: new Date().toISOString(), payload: { exportedAt: payload.exportedAt } }); await tx.done; }
}
export function validateBackup(payload: unknown): asserts payload is BackupPayload { if (!payload || typeof payload !== "object") throw new Error("Backup must be an object"); const value = payload as Partial<BackupPayload>; if (value.schemaVersion !== DB_VERSION || !Array.isArray(value.progresses) || !Array.isArray(value.attempts) || !Array.isArray(value.sessions) || !Array.isArray(value.analytics)) throw new Error(`Unsupported or malformed backup schema; expected version ${DB_VERSION}`); }
