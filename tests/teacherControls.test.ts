import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import { DB_NAME } from "../src/storage/db";
import { IndexedDbProgressRepository } from "../src/storage/progressRepository";
import { forceReviewSoon, updateTeacherControls } from "../src/teacher/controls";

describe("teacher controls and backup", () => {
  beforeEach(async () => { await deleteDB(DB_NAME); });
  it("persists controls and round-trips them through the versioned backup", async () => {
    const repo = new IndexedDbProgressRepository();
    await updateTeacherControls(repo, "colour-purple", { teacherIntroduced: true, schedulerEnabled: false });
    await forceReviewSoon(repo, "colour-purple");
    expect(await repo.getConceptProgress("colour-purple")).toMatchObject({ teacherIntroduced: true, schedulerEnabled: false, reviewPriority: "soon" });
    const backup = await repo.exportBackup();
    const other = new IndexedDbProgressRepository(); await other.importBackup(backup);
    expect(await other.getConceptProgress("colour-purple")).toMatchObject({ teacherIntroduced: true, schedulerEnabled: false, reviewPriority: "soon" });
    expect((await other.getAnalytics()).some((event) => event.type === "backup_imported")).toBe(true);
  });
});
