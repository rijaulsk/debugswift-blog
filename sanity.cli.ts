import { defineCliConfig } from "sanity/cli";
import { SANITY_DATASET, SANITY_PROJECT_ID } from "./lib/env";

/* For the `sanity` CLI (dataset management, schema deploy, GraphQL). The Studio
 * itself is served by Next at /blog/studio and does NOT use this file —
 * sanity.config.ts is its configuration. */
export default defineCliConfig({
  api: {
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
  },
  /* This repo is a Next app that happens to embed a Studio, not a Studio
   * project, so there is nothing for `sanity build` to output. */
  autoUpdates: false,
});
