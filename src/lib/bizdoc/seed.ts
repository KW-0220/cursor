import "server-only";
import {
  createDraftSecondary,
  seedDemo,
} from "@/lib/bizdoc/store";
import {
  countBizApplications,
  upsertBizApplicationToDb,
} from "@/lib/bizdoc/supabase";
import type { BizApplication } from "@/lib/bizdoc/types";

export function buildSeedApplications(): BizApplication[] {
  return [seedDemo(), createDraftSecondary()];
}

export async function seedDemoApplications(opts?: {
  force?: boolean;
}): Promise<BizApplication[]> {
  if (!opts?.force) {
    const n = await countBizApplications();
    if (n > 0) {
      const { listBizApplicationsFromDb } = await import(
        "@/lib/bizdoc/supabase"
      );
      return listBizApplicationsFromDb();
    }
  }
  const seeds = buildSeedApplications();
  const saved: BizApplication[] = [];
  for (const app of seeds) {
    saved.push(await upsertBizApplicationToDb(app));
  }
  return saved;
}
