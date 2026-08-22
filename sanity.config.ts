import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import {
  cloudinaryAssetSourcePlugin,
  cloudinarySchemaPlugin,
} from "sanity-plugin-cloudinary";
import {
  ApprovePitchAction,
  DeclinePitchAction,
} from "@/sanity/actions/approvePitch";
import { CreatePostFromDraftAction } from "@/sanity/actions/createPostFromDraft";
import { SchedulePostAction } from "@/sanity/actions/schedulePost";
import { schemaTypes } from "@/sanity/schemaTypes";
import { structure } from "@/sanity/structure";
import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from "@/lib/env";

/* The Studio, embedded in this app at /blog/studio.
 *
 * basePath here is the FULL path from the domain root — "/blog/studio", not
 * "/studio". Next's basePath and the Studio's basePath are configured
 * independently and neither knows about the other, so the Studio's router would
 * otherwise build URLs at /studio/... and lose its own navigation the moment
 * anyone clicked anything.
 *
 * Both Cloudinary plugins are needed and they do different jobs:
 *   · cloudinarySchemaPlugin registers the `cloudinary.asset` type the post,
 *     topic and author schemas declare fields of.
 *   · cloudinaryAssetSourcePlugin adds Cloudinary's media library as a picker
 *     inside the Studio, so an editor uploads and browses without leaving.
 *
 * CORS: Sanity blocks the Studio from origins it hasn't been told about. Add
 * http://localhost:3000 for development, and BOTH the Vercel origin and
 * https://debugswift.com in production — the proxy means the Studio is genuinely
 * served from two hostnames.
 */
export default defineConfig({
  name: "debugswift-blog",
  title: "DebugSwift Blog",
  basePath: "/blog/studio",

  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,

  plugins: [
    structureTool({ structure }),
    cloudinarySchemaPlugin(),
    cloudinaryAssetSourcePlugin(),
    /* GROQ playground. Harmless in production — it can only run queries the
     * signed-in editor is already authorised for. */
    visionTool({ defaultApiVersion: SANITY_API_VERSION }),
  ],

  schema: { types: schemaTypes },

  document: {
    actions: (prev, context) => {
      if (context.schemaType === "guestPitch") {
        /* Read-only document type, so the default publish/duplicate actions are
         * meaningless here — replaced wholesale rather than appended to. */
        return [ApprovePitchAction, DeclinePitchAction];
      }
      if (context.schemaType === "guestDraft") {
        return [CreatePostFromDraftAction];
      }
      if (context.schemaType === "siteSettings") {
        /* A singleton must not be duplicable or deletable — either would create
         * the ambiguity the singleton exists to prevent. */
        return prev.filter(
          ({ action }) => action && !["duplicate", "delete", "unpublish"].includes(action),
        );
      }
      if (context.schemaType === "post") {
        /* Scheduling sits BESIDE Publish, not instead of it. The action is
         * disabled until the document would actually publish, so a queued post
         * has already cleared the cover and originality gates. */
        return [...prev, SchedulePostAction];
      }
      return prev;
    },
  },
});
