/* Subpath import — see the note in sanity/structure.ts. */
import { DocumentsIcon } from "@sanity/icons/Documents";
import { useState } from "react";
import { useClient, type DocumentActionComponent } from "sanity";
import { SANITY_API_VERSION } from "@/lib/env";

/* Step 4 of the guest pipeline: turn a received draft into an editable post.
 *
 * The post it creates is a SANITY DRAFT (id prefixed "drafts."), never a
 * published document. Nothing a stranger submitted reaches the site without the
 * owner reading it and pressing Publish — that is the approval gate, and it is
 * not configurable.
 *
 * Two more things this does deliberately:
 *   · The author document it finds-or-creates is marked isGuest: true, which
 *     forces rel="nofollow ugc" on every outbound link in that person's bio and
 *     body (components/PostBody.tsx). A guest section without that switch is a
 *     link farm with extra steps.
 *   · shortAnswer, excerpt and topic are left EMPTY on purpose. They are
 *     required fields, so the post cannot be published until a human has
 *     written them — and they are exactly the fields a guest writer has no way
 *     to get right for this site. */

type ParsedBlock = Record<string, unknown>;

let keySeed = 0;
const key = () => `g${Date.now().toString(36)}${(keySeed += 1)}`;

/**
 * Plain text / markdown → Portable Text.
 *
 * Intentionally shallow: headings, blockquotes, bullets and paragraphs. The
 * public endpoint accepts a STRING, so nothing richer can arrive — which is the
 * point. A submission cannot smuggle in a block type, an asset reference or a
 * mark annotation, because there is no path from the form to those shapes.
 */
function textToBlocks(input: string): ParsedBlock[] {
  const chunks = (input ?? "").split(/\n{2,}/);
  const blocks: ParsedBlock[] = [];

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    for (const line of chunk.split("\n")) {
      const text = line.trim();
      if (!text) continue;

      let style = "normal";
      let listItem: string | undefined;
      let content = text;

      if (text.startsWith("### ")) {
        style = "h3";
        content = text.slice(4);
      } else if (text.startsWith("## ")) {
        style = "h2";
        content = text.slice(3);
      } else if (text.startsWith("# ")) {
        /* Demoted, never kept as H1: the post title is the page's only H1. */
        style = "h2";
        content = text.slice(2);
      } else if (text.startsWith("> ")) {
        style = "blockquote";
        content = text.slice(2);
      } else if (/^[-*]\s+/.test(text)) {
        listItem = "bullet";
        content = text.replace(/^[-*]\s+/, "");
      } else if (/^\d+[.)]\s+/.test(text)) {
        listItem = "number";
        content = text.replace(/^\d+[.)]\s+/, "");
      }

      blocks.push({
        _type: "block",
        _key: key(),
        style,
        markDefs: [],
        children: [{ _type: "span", _key: key(), text: content, marks: [] }],
        ...(listItem ? { listItem, level: 1 } : {}),
      });
    }
  }

  return blocks;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/* PascalCase — see the note in approvePitch.ts. */
export const CreatePostFromDraftAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  const [busy, setBusy] = useState(false);

  const doc = props.published as
    | {
        _id?: string;
        title?: string;
        body?: string;
        authorName?: string;
        authorEmail?: string;
        authorBio?: string;
        status?: string;
      }
    | undefined;

  if (props.type !== "guestDraft") return null;
  if (doc?.status === "converted") {
    return { label: "Already converted", icon: DocumentsIcon, disabled: true };
  }

  return {
    label: busy ? "Creating…" : "Create post from draft",
    icon: DocumentsIcon,
    tone: "primary",
    disabled: busy || !doc?._id || !doc?.title,
    onHandle: async () => {
      if (!doc?._id || !doc.title) return;
      setBusy(true);

      /* Find-or-create the guest author. Matching on name is good enough for a
       * queue a human is reading anyway — and creating a second author document
       * for a returning writer is a far smaller problem than silently attaching
       * a post to the wrong person. */
      const authorSlug = slugify(doc.authorName ?? "guest");
      const existing = await client.fetch<{ _id: string } | null>(
        `*[_type == "author" && slug.current == $slug][0]{ _id }`,
        { slug: authorSlug },
      );

      let authorId = existing?._id;
      if (!authorId) {
        const created = await client.create({
          _type: "author",
          name: doc.authorName ?? "Guest contributor",
          slug: { _type: "slug", current: authorSlug },
          role: "Guest contributor",
          bio: doc.authorBio ?? "",
          isGuest: true,
          links: [],
        });
        authorId = created._id;
      }

      const postId = `drafts.post-${slugify(doc.title)}-${Date.now().toString(36)}`;
      await client.createIfNotExists({
        _id: postId,
        _type: "post",
        title: doc.title,
        slug: { _type: "slug", current: slugify(doc.title) },
        body: textToBlocks(doc.body ?? ""),
        author: { _type: "reference", _ref: authorId },
        publishedAt: new Date().toISOString(),
        noindex: false,
        featured: false,
        /* excerpt, shortAnswer and topic are required and deliberately absent —
         * the post cannot be published until an editor supplies them. */
      });

      await client.patch(doc._id).set({ status: "converted" }).commit();

      setBusy(false);
      props.onComplete();
    },
  };
};
