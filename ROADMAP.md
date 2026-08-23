# Blog roadmap

What is built, what is next, and the decisions already taken so nobody relitigates them.
`CLAUDE.md` is the constitution; `WRITING-GUIDE.md` is the authority on writing. This
file is only sequencing.

---

## Built

| | |
|---|---|
| Content model | Sanity + Cloudinary, 5 topics, 1 author, 3 posts |
| Two ways in | type into the Studio, or `drafts/<slug>.md` → `npm run push` |
| Round trip | `npm run pull` → edit → `npm run push`; all 3 posts convert back byte-identical |
| One validator | `sanity/lib/validatePost.ts`, shared by the Studio, `check-content` and the CLI |
| Scheduling | "Schedule for…" in the Studio + a 10-minute job (`scripts/publish-due.ts`) |
| AEO / GEO | `BlogPosting`, `FAQPage`, `HowTo`, `Speakable`, `AudioObject`, `BreadcrumbList`, `CollectionPage`, `llms.txt`, `llms-full.txt`, `/md/<slug>` twins, a required 40–60 word `shortAnswer` |
| Audio | `npm run audio <slug>` → TTS → Cloudinary, voice disclosed under the player |
| Guest posts | public pitch → single-use expiring invite → draft → human converts |

---

## The one that bit us — read this before trusting a deploy

**23 Aug 2026: the blog went live serving the `content/` fixtures, not Sanity**, and
stayed that way unnoticed. `NEXT_PUBLIC_SANITY_PROJECT_ID` was never set on the Vercel
project, so `lib/content.ts` took the local-content path in production.

It is invisible from the outside. Every URL returns 200, the sitemap resolves, the feeds
work, the posts are all there — because the fixtures are copies of the same three posts.
Publishing in the Studio changed nothing on the site and produced no error anywhere.

**Never verify "the blog is live" with HTTP 200s.** The three checks that actually
distinguish it:

| Check | Fixtures | Sanity |
|---|---|---|
| `/blog/studio` | "No Sanity project connected yet" | the Studio loads |
| Card image URLs in the markup | `/photos/…` | `res.cloudinary.com/…` |
| Cover present at all | yes (fixtures ship covers) | only once one is attached |

`lib/env.ts` now throws at build time when `VERCEL` is set and the project ID is not, so
this cannot recur silently. A failed build is the intended outcome; Vercel keeps serving
the last good deployment while it is fixed.

Related trap: `NEXT_PUBLIC_*` values are inlined at BUILD time. Setting them in Vercel
does nothing to an existing deployment — it needs a redeploy. And they are scoped per
environment, so Production must be ticked, not just Preview.

## Blocked on going live

In order. Nothing below matters until the blog is actually reachable.

1. ~~**GitHub repo + push.**~~ Done 23 Aug 2026 — `github.com/rijaulsk/debugswift-blog`,
   branch `main`.
2. **Vercel env vars — STILL OUTSTANDING as of 23 Aug 2026.** `REVALIDATE_SECRET` is set
   and verified (`{"revalidated":true}`). These five are not, and until they are the site
   serves fixtures — see the section above:
   `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`,
   `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_WRITE_TOKEN`,
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
   **Not** the Cloudinary key/secret, **not** any `TTS_*`, **not** the Cloudflare pair —
   those are local-only CLI credentials.
3. **Sanity webhook** → `https://<blog>.vercel.app/blog/api/revalidate`, header
   `x-revalidate-secret`, filter `_type == "post"`. The Vercel origin directly, not
   through the proxy.
4. **GitHub repository secrets** for the scheduler: `SANITY_PROJECT_ID`,
   `SANITY_DATASET`, `SANITY_API_VERSION`, `SANITY_API_WRITE_TOKEN`,
   `BLOG_PUBLIC_ORIGIN`, `REVALIDATE_SECRET`.
5. **`BLOG_ORIGIN`** on the MAIN Vercel project.
6. **Main repo, same change as 5** — all three together, per its own `robots.ts` note:
   add `/blog` to `app/sitemap.ts`, re-add `https://debugswift.com/blog/sitemap.xml` to
   `app/robots.ts`, delete `app/blog/page.tsx`.

**What actually blocks the three posts, checked against the live dataset 23 Aug 2026:**

| Post | Blocked by |
|---|---|
| `why-does-my-spreadsheet-keep-breaking` | originality record |
| `why-do-i-keep-missing-enquiries-at-night` | originality record |
| `is-this-agency-quote-too-high` | originality record, **and** "leverage" in the closing FAQ |

The missing covers are only warnings now. The originality fields are a human step by
design and `npm run push` is forbidden to write them.

**The `leverage` question.** The sentence is *"…at a point where you have no leverage
because switching would mean starting again."* That is the noun — bargaining power — used
plainly, not the marketing verb the rule was written to ban. Two ways out: reword to "no
room to negotiate", or add it to the stem exceptions in `sanity/lib/rules.ts` the way
`transformer` and `elevator` already are. It is a copy decision, so it waits for the
owner.

---

## Next, in value order

### 1. ~~Coded share cards~~ — done 23 Aug 2026
`/blog/og/<slug>` draws a card with the post's own title, topic and reading time.
Prerendered at build, one per post. `lib/seo.ts` picks: a Cloudinary cover wins, this is
the fallback, the site card only when there is no post.

Unblocked by copying two static Satoshi weights from `E:\Fonts\OTF` into `public/fonts/`
— Satori cannot read the woff2 the browser uses, and static instances are safer than the
variable file.

### 2. ~~Coded in-page cover fallback~~ — dropped 23 Aug 2026, and it was a bad idea
Written down on 22 Aug, reconsidered when it came to building it. A share card needs the
title *in* it because a thumbnail has no other context. An in-page header does not: the
title is already the first thing on the page, in real type, one line above. A decorative
box repeating it would be redundant, and it would push the short answer further down —
the exact thing `app/[slug]/page.tsx`'s own header comment says the reading order exists
to protect.

A post with no photograph should simply have no photograph. Nothing to build.

`cover.present` stays a **warning**, so a missing cover no longer blocks publishing at
all — the generated share card covers the only job the cover was really doing.

### 3. Generated photographs — at ~10 posts, not before
**Cloudflare Workers AI + FLUX.1 Schnell** is the free option worth using: free daily
allowance, no card, Apache-2.0 model. Groq and OpenRouter are text-only and cannot do
this.

Deferred on purpose. With three posts you would spend longer wiring it than generating,
every image needs checking against `IMAGE-PROMPTS.md` §9, and you do not yet know what
these covers should look like. The script is easy; the taste is the hard part and cannot
be automated on day one.

When it happens: prompt = the §65 Style Preamble + the post's subject. **Never a human
face** — §9 forbids it and so do the honesty rules. Review every image; never attach
blind.

### 4. Topic pillar bodies
Every topic has `pillar: null`, so each hub is a bare listing. `app/sitemap.ts` already
excludes a topic with no pillar *and* no posts. Write the pillar before the third post
lands in a topic — that is what turns a tag list into a cluster.

### 5. The blog assistant (Groq)
Deferred until roughly ten posts. Decisions already taken so it can be built quickly:

- **Groq, not the writing models.** Groq is for *answering*, never for drafting — the
  voice rules are why writing stays with Claude Code and Antigravity.
- **No vector database.** `/blog/llms-full.txt` is the entire corpus in one fetch, and it
  will fit in context for a long time. Reach for embeddings when it stops fitting, not
  before.
- **It must cite.** Every answer names the post it came from and links it. An assistant
  that answers without a source is inventing proof, which is the one thing this brand
  does not do.
- **It must refuse.** No pricing, no "how long would my project take", no anything not in
  a published post. Those questions go to `/contact#diagnosis`, which is the actual
  conversion. Same shape as the Lead Engine's honesty guard.
- Server-side route only; the Groq key never reaches the browser.

### 6. Not doing: a `npm run draft` model CLI
Considered and dropped 22 Aug 2026. Claude Code and Antigravity already write better
long-form than a scripted one-shot call, because they read `WRITING-GUIDE.md`, iterate,
and run `push --dry-run` themselves. A CLI's only real edge is headless batching, which
is not needed, and it would be a second place for the voice rules to drift.

---

## Standing constraints

- **No fixed costs before revenue.** That is why scheduling is ours rather than Sanity
  Growth, and why image generation will be Cloudflare's free tier.
- **`content/` is dead weight now.** Once `NEXT_PUBLIC_SANITY_PROJECT_ID` is set, nothing
  in that folder renders. It stays as the fixture `npm run check-content` runs against.
- **The `git push` habit does not apply here.** A file committed to `content/` publishes
  nothing and the build still goes green. `npm run push <slug>` is the equivalent.
