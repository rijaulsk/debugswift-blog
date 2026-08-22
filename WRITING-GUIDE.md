# The DebugSwift blog — writing guide

Everything needed to produce a post that sounds like every other post on this site,
survives an originality check, and passes the validation rules in the Studio.

Five things have to stay in agreement. If you change one, change all five:

| | |
|---|---|
| **This file** | the rules, the prompt you paste into an AI assistant, and the draft-file format (§7) |
| `sanity/lib/postTemplate.ts` | the skeleton every new post opens with |
| `sanity/lib/rules.ts` | the vocabulary rules — banned words, tired phrases, the service link |
| `sanity/lib/validatePost.ts` | every rule, in one implementation, called by the Studio, `check-content` and `push` |
| `scripts/lib/draftFormat.ts` | the `drafts/<slug>.md` grammar |

---

## 1. The prompt

Paste this whole block, then add your topic at the bottom. It is written to be handed
to a model cold, with no other context.

> You are writing a blog post for DebugSwift, a founder-led technology agency in
> Kolkata, India, run by Rijaul Sk and working worldwide. The company's philosophy:
> understand a business, find the problem costing it most, and fix it with technology.
> They call it debugging businesses.
>
> The reader is the owner of a small or mid-sized business. Not a developer, not a
> marketer, not another agency. They are busy, mildly sceptical of technology
> salespeople, and have been sold something that didn't work before.
>
> **Voice**
> - Plain words, the owner's own language. "Orders in chat scroll away", never
>   "streamlined order management".
> - Diagnosis, not pitch. Describe problems and fixes. Never hype.
> - Blunt honesty is the whole differentiator. Say plainly when something is not worth
>   buying. "Don't spend money on this yet" is on-brand.
> - Specific beats superlative. Real objects, real times of day, real amounts. If a
>   sentence would survive on any agency's website, delete it.
> - First person plural ("we"). Rijaul speaks as "I" only where he is personally
>   accountable.
> - Short sentences carry the argument. Vary the length, but when a point matters, make
>   it short.
> - British English spelling.
>
> **Hard rules — breaking any of these makes the post unpublishable**
> - Never invent a statistic, a percentage, a survey, a case study, a client, a
>   testimonial, or a result. Not even a plausible one. Not even hedged with "studies
>   show". If you have no verified source, make the argument without a number.
> - The only numbers allowed are: product specifications (10 seconds, 7 days, 2–4
>   questions), and arithmetic the reader performs on their own inputs.
> - Never invent a person, a quote, or a company.
> - Hypotheticals must announce themselves: open with "Say you run…", "Imagine…", or
>   "A typical…". Never write a hypothetical so it reads like something that happened.
> - Banned words, in any form: **elevate, empower, unlock, transform, seamless,
>   leverage.** These fail validation.
> - Avoid: journey, delight, supercharge, game-changer, cutting-edge, revolutionize,
>   "in today's fast-paced world", "in the world of", "dive into", "in conclusion",
>   "it's important to note", "when it comes to".
> - No em-dash pile-ups, no triads ("faster, smarter, better"), no rhetorical question
>   openings, no "But here's the thing." These are the tells of machine-written copy.
>
> **Structure** — follow this exactly, in this order:
> 1. **Title**: one question, phrased the way an owner would ask it. "Why does my
>    spreadsheet keep breaking?" — not "5 Productivity Hacks". Under 90 characters.
> 2. **Short answer**: 40–60 words, answering the title directly, making complete sense
>    to someone who reads nothing else. This is what gets quoted.
> 3. **Key takeaways**: 2–5 sentences, each standing alone, out of order, with no
>    surrounding paragraph.
> 4. **Opening**: three paragraphs. A concrete scene in the reader's week — a time of
>    day, a real object. Then what went wrong. Then the problem named in one sentence.
> 5. **Why this happens**: the mechanism, in the owner's language.
> 6. **What it actually costs**: the cost of leaving it alone, using the reader's own
>    arithmetic.
> 7. **How to find out for yourself**: something they can do this week with what they
>    already have. Number the steps if it is a genuine procedure.
> 8. **What a fix looks like**: what good looks like, plainly.
> 9. **When this isn't worth buying**: mandatory. Say who should not spend money on
>    this, and why. Never skip this section.
> 10. **Closing**: the diagnosis question — something they can answer about their own
>     business in ninety seconds — then exactly one call to action.
>
> **Length**: 800–1,500 words of body. One idea. A concrete example inside the first
> three paragraphs. No paragraph longer than three lines near the top. Every H2 must
> pass a five-second test: a skimmer gets the point from headings alone.
>
> **Links**: link at least one DebugSwift service page. Use the real URLs:
> https://debugswift.com/services/ai-automation, /ai-integration,
> /business-process-automation, /web-apps-saas, /web-app-development,
> /conversion-websites, /landing-pages-ad-campaigns, /seo-local-lead-gen,
> /brand-design-systems, /ecommerce, /technical-consulting, and the flagship
> https://debugswift.com/lead-engine. The closing CTA links to
> https://debugswift.com/contact#diagnosis.
>
> **Output**: markdown. `##` for section headings — never `#`, the title is the only H1.
> Give me the title, the short answer, the key takeaways, and the body, labelled.
>
> The topic is: _[your topic here]_

---

## 2. Voice — what "the same speech pattern" actually means

The five things that make two posts sound like one writer:

1. **Concrete nouns early.** Not "communication challenges" — "a message at 11pm about
   a flooded kitchen". Every abstraction gets an object attached to it within a sentence.
2. **The reader's arithmetic, not ours.** We never say what something costs. We show
   them how to work out what it costs *them*, using their own numbers.
3. **The honest paragraph.** Every post says who should not buy. It is the section that
   makes the other nine credible.
4. **Sentence rhythm.** Long sentence to build the picture, short one to land it. If
   three sentences in a row are the same length, the paragraph reads like a manual.
5. **No throat-clearing.** The first sentence is already in the scene. There is no
   "In this article we'll explore".

**The tells to strip out of an AI draft.** These are the specific habits that make
otherwise fine writing read as generated:

- Sentences built on "not just X, but Y".
- Paragraphs that open "The truth is", "Here's the thing", "Let's be honest".
- Triads of adjectives, especially alliterative ones.
- "Whether you're a X or a Y…" openings.
- Perfectly parallel bullet lists where every item is the same length and structure.
- A conclusion that restates the article instead of asking a question.
- Hedging stacks: "can often potentially help".

---

## 3. Originality — required, and enforced

The Studio **will not publish** a post without `originalityCheckedWith` and
`originalityCheckedAt` filled in. That is deliberate: "every post is checked" is either
something we can back or something we shouldn't say.

**Why this matters more for AI-assisted drafts.** A model reproduces phrasing from its
training data without intending to and without flagging it. The risk is not deliberate
copying — it is a well-turned sentence that already exists on someone else's site.

**The check, in order:**

1. Run the draft through a checker. Free tiers are enough at this volume — Quetext,
   Copyleaks, or Grammarly's plagiarism check. Record which one and the date.
2. Take the ten most distinctive sentences and search each as an exact phrase in Google,
   in quotation marks. This catches what the free checkers miss.
3. Any match that isn't a common idiom gets rewritten from scratch — not paraphrased.
   Paraphrasing a sentence you didn't write leaves its structure behind, which is still
   the other writer's work.
4. Every fact traceable to a source gets that source in the `sources` array, and every
   statistic goes in a **Sourced statistic** block, which will not save without a URL.
5. Note anything the checker flagged that was legitimately fine — a quoted source, a
   product name, a common phrase — in `originalityNotes`, so the next person doesn't
   re-investigate it.

**Never** paste text from another site into a draft "to edit later". It survives.

---

## 4. What the Studio enforces

So you know what will stop you publishing, and what is only advice:

| Rule | Field | Blocks publish? |
|---|---|---|
| Banned words | title, excerpt, short answer, body | **Yes** |
| Tired phrases | title, excerpt, short answer, body | No — warning |
| Short answer 40–60 words | short answer | **Yes** (30–80 hard bounds) |
| Excerpt ≤160 characters | excerpt | **Yes** |
| Title ≤90 characters | title | **Yes** |
| At least one service link | body | **Yes** |
| Template text removed | body | **Yes** |
| Body 800–1,500 words | body | No — warning |
| Originality check recorded | pre-publish checks | **Yes** |
| Topic and author set | both | **Yes** |
| Alt text when there's a cover | cover alt | **Yes** |

These fire inside the Studio. The local content in `content/` never passes through
Sanity, and `npm run seed` writes via the API, which does not validate — so
`npm run check-content` runs the same rules over `content/` from the command line.

---

## 5. After the writing

1. **Get it into Sanity**, one of two ways. Either paste into the Studio, replacing the
   template scaffolding — or write `drafts/<slug>.md` and run `npm run push <slug>`,
   which is §7. Both land in the same place; the second is the one an AI assistant uses,
   and it validates before it writes. Structural blocks (Steps, FAQ, Comparison table,
   Service link, Sourced statistic) exist because each one produces machine-readable
   output — use them where they genuinely apply, not for decoration.
2. **Cover image**: upload through the Cloudinary picker. Alt text describes what the
   image shows *in this post* — the same asset in another post usually needs a different
   sentence.
3. **Originality fields**: tool and date. It will not publish without them.
4. **Publish.**
5. **Generate the audio**: `npm run audio <slug>`. It reads the post from Sanity,
   synthesises it, uploads to Cloudinary and attaches it. Posts without audio simply
   show no player.
6. **Check it back**: the post at `/blog/<slug>`, the markdown twin at
   `/blog/md/<slug>`, and the entry in `/blog/llms.txt`.

---

## 6. Updating a published post

- Change the slug? Put the old one in **Old slugs** first. It becomes a permanent
  redirect at build, and the post keeps every link and ranking the old URL earned.
- Substantial rewrite? Set **Last substantially updated**. It drives `dateModified` and
  the sitemap.
- Typo fix? Leave that date alone. Bumping it for a typo is freshness-gaming, and it is
  the kind of signal that gets a site discounted rather than promoted.
- Regenerate the audio after any real change: `npm run audio <slug> -- --force`.
  **The `--` is required.** npm treats `--force` as one of its own flags and swallows it
  before the script sees it, so `npm run audio <slug> --force` silently does not force.
- Editing a published post as a file? `npm run pull <slug>` first, always. It writes
  `drafts/<slug>.md` from what is actually in Sanity. Pushing a stale draft file would
  quietly revert whatever changed in the Studio since — which is why `push` refuses to
  touch a published post without `--update`.

---

## 7. The draft file format — `drafts/<slug>.md`

One shape a person, Claude Code and Antigravity can all produce for the same pipeline.

```
npm run pull <slug>                 # Sanity -> drafts/<slug>.md
npm run push <slug> -- --dry-run    # validate, write nothing
npm run push <slug>                 # write an UNPUBLISHED draft
npm run push <slug> -- --update     # edit a post that is already live
npm run push <slug> -- --force      # overwrite hand edits made in the Studio
```

**A draft file is a submission, not a mirror.** Once a post is published, the Studio is
the source of truth. `push` never writes back into the file.

### Frontmatter — scalars only

One `key: value` per line; everything after the first colon is taken literally, so a
title containing `: ` is fine. No lists, no nesting — anything structured is a fence.

`title` · `slug` (must match the filename) · `excerpt` · `topic` (slug) · `author` (slug)
· `publishedAt` · `updatedAt` · `cover` (Cloudinary public_id) · `coverAlt` · `seoTitle` ·
`seoDescription` · `noindex`

### Blocks — fences tagged `ds-`

The rule is total: **every DebugSwift block is a fence tagged `ds-<name>`; every other
fence is a code block whose language is its tag.** So ` ```ts ` is a code sample and
there is no "unknown fence" error to worry about.

| fence | what it becomes | payload |
|---|---|---|
| `ds-short-answer` | the Short answer field | prose, 40–60 words |
| `ds-takeaways` | Key takeaways | one per line |
| `ds-closing-faq` | the closing FAQ field | JSON `[{question, answer}]` |
| `ds-sources` | Sources | JSON `[{label, url}]` |
| `ds-note` | **nothing** — printed for the reviewer, never published | prose |
| `ds-callout` | Callout | JSON `{tone: "note"\|"warning", title?, text}` |
| `ds-faq` | an in-body FAQ | JSON `[{question, answer}]`, min 1 |
| `ds-steps` | Steps (HowTo data) | JSON `{title?, steps: [{title, text?}]}`, min 2 |
| `ds-table` | Comparison table | JSON `{caption?, columns: [2–4], rows: string[][]}` |
| `ds-service` | Service link | JSON `{serviceSlug, blurb}` |
| `ds-stat` | Sourced statistic | JSON `{value, label, sourceLabel, sourceUrl}` |
| `ds-figure` | an image | JSON `{publicId, alt, caption?}` |

Inline, exactly four forms: `**bold**`, `_em_`, `` `code` ``, `[label](url)`. They nest,
so `**[a link](url)**` is one bold link rather than literal brackets on the page.

### What `push` will not do

- **It never writes the originality fields.** The parser rejects a file that even
  mentions them. §3 is a human step, and a model asserting it ran a plagiarism check is
  the invented-proof failure the honesty rules exist to stop. Put what you would suggest
  checking in a `ds-originality-notes` fence instead — on a first push that text is
  filed under Notes, behind a line saying no check has been run.
- **It never invents a cover.** `cover:` must name a Cloudinary public_id that already
  exists; the CLI verifies it and takes Cloudinary's own dimensions. No cover is fine —
  omit the field and say what you would suggest in a `ds-note`. A wrong public_id is a
  broken image on a live page.
- **It never creates a topic or an author.** Unknown slug, hard stop, with the valid ones
  listed.
- **It never renames a slug, never sets `updatedAt`, and never publishes.**

### When two people (or two agents) touch the same post

Each push records a hash of the fields it owns. If the Studio copy has changed since,
push names the fields and refuses, rather than overwriting your edit — `npm run pull` to
take the newer version, or `--force` if the file really is the good copy. Two pushes at
once are settled by Sanity's own revision check, not by a lock file, so it holds across
two machines.

Exit codes: `0` ok · `1` usage · `2` validation failed · `3` already published · `4`
edited by hand · `5` concurrent write.

---

## 8. Scheduling a post

**"Schedule for…"** sits beside Publish in the Studio. Pick a date and time in your own
timezone; the post goes live within about ten minutes of it, and its publish date is set
to the time you chose. The document list shows what is queued, and the same button
cancels a schedule.

The button is **disabled until the post would actually publish**. That is deliberate: it
means the cover and the originality check are done *before* anything is queued, so
scheduling never becomes a way to skip them. Hover it to see which rule is in the way.

If something changes after you queue it — a cover unset, a body edited into a banned word
— the job **leaves the post in the queue and reports it** rather than publishing it
broken or silently unscheduling it. Fix the problem and the next run picks it up.

Two things worth knowing:

- **Ten minutes, not to the second.** The job runs on a timer and can be delayed a few
  minutes when the runners are busy. Fine for a blog; do not schedule anything to
  coincide with something external.
- **It will not run if the repository sits untouched for 60 days.** That is a GitHub
  rule, not ours. If you stop committing for two months, check the queue before trusting
  it.
