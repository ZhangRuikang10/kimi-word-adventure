import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import { createProgress } from "../src/engine/mastery";
import { DB_NAME } from "../src/storage/db";
import { IndexedDbProgressRepository } from "../src/storage/progressRepository";
describe("IndexedDB repository",()=>{beforeEach(async()=>{await deleteDB(DB_NAME)});it("persists progress and produces a versioned backup",async()=>{const repo=new IndexedDbProgressRepository();const progress={...createProgress("colour-red"),introducedAt:"2026-09-27T00:00:00Z"};await repo.saveConceptProgress(progress);const backup=await repo.exportBackup();expect(backup.schemaVersion).toBe(1);expect(backup.progresses).toEqual([progress]);const other=new IndexedDbProgressRepository();expect(await other.getConceptProgress("colour-red")).toEqual(progress);});});
