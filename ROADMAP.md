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

## Blocked on going live

In order. Nothing below matters until the blog is actually reachable.

1. **GitHub repo + push.** Still no remote.
2. **Vercel import** as its own project, never the website's. Env: the four Sanity vars,
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `REVALIDATE_SECRET`. **Not** the Cloudinary
   key/secret, **not** any `TTS_*` — those are `npm run audio`, local only.
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

The three seeded posts have **no cover and no originality record**, so none of them can
publish from the Studio until a person does both.

---

## Next, in value order

### 1. Coded share cards
Every post currently shares the same generic `public/og.png`. A per-post card carrying
the title is the highest-value visual fix on the list: it touches every link anyone
posts, and a photograph without text is *worse* at thumbnail size than a typographic
card.

Blocked on one thing only: **Satori cannot read woff2**, and `public/fonts/` has nothing
else. Download Satoshi from Fontshare (already licensed and in use), drop the **OTF or
TTF** into `public/fonts/`, and an `opengraph-image.tsx` per route becomes a couple of
hours' work. Generate at build time, not per request.

Design: cream `#F7F3EB`, the faint circuit motif, title in Satoshi, one clay `#E87D4A`
accent, the mark bottom-left. `debugswift-assets/IMAGE-PROMPTS.md` §8 already argues that
this class of asset should be coded rather than generated.

### 2. Stop covers being a gate
`cover.present` is a warning, not an error — deliberately, because making it required
would block the three seeded posts and there is no honest way for a script to invent a
photograph. Add a **coded fallback header** so a post without a photograph still looks
designed, and real photography becomes an upgrade rather than a blocker.

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
