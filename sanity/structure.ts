/* @sanity/icons v5 ships one module per icon and its barrel exports only
 * `Icon` and `icons` — importing { CogIcon } from "@sanity/icons" type-checks
 * against the .d.ts and then fails at build with "export not found". Subpath
 * imports are the supported form, and they tree-shake properly besides. */
import { CogIcon } from "@sanity/icons/Cog";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { FolderIcon } from "@sanity/icons/Folder";
import { UsersIcon } from "@sanity/icons/Users";
import type { StructureResolver } from "sanity/structure";

/* Studio navigation.
 *
 * Ordered by how often each thing is actually opened, not alphabetically:
 * Posts, then the taxonomy, then the guest queues, then settings. The two
 * guest queues are separate panes rather than one "Submissions" folder because
 * they are two different jobs — reading pitches is a five-second decision,
 * reading drafts is a twenty-minute one.
 *
 * Blog settings is a singleton: listing one document as a list of one is a
 * click nobody needs, and it also stops a second settings document being
 * created by accident, which would make "which one wins?" a real question. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Blog")
    .items([
      S.documentTypeListItem("post").title("Posts").icon(DocumentTextIcon),
      S.divider(),
      S.documentTypeListItem("topic").title("Topics").icon(FolderIcon),
      S.documentTypeListItem("author").title("Authors").icon(UsersIcon),
      S.divider(),
      S.listItem()
        .title("Guest pitches")
        .icon(EnvelopeIcon)
        .child(
          S.documentTypeList("guestPitch")
            .title("Guest pitches")
            .defaultOrdering([{ field: "submittedAt", direction: "desc" }]),
        ),
      S.listItem()
        .title("Guest drafts")
        .icon(DocumentTextIcon)
        .child(
          S.documentTypeList("guestDraft")
            .title("Guest drafts")
            .defaultOrdering([{ field: "submittedAt", direction: "desc" }]),
        ),
      S.divider(),
      S.listItem()
        .title("Blog settings")
        .icon(CogIcon)
        .child(
          S.document().schemaType("siteSettings").documentId("siteSettings"),
        ),
    ]);
