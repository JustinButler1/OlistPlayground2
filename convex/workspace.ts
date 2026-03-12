import { query } from "./_generated/server";
import { collectSnapshot } from "./shared";

export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    return await collectSnapshot(ctx);
  },
});
