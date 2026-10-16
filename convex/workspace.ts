import { query } from "./auth";
import { collectSnapshot } from "./shared";

export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    return await collectSnapshot(ctx);
  },
});
