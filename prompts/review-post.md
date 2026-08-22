# Procedure: review a post before it is pushed

Read-only. **You inspect, grade and report. You never edit the draft.**

Claude Code reaches this through the `content-review` agent; Antigravity is pointed at
this file. The point of the review is everything a linter structurally cannot do — so
start by running the linter, then spend your effort on the rest.

## 1. Run the machine checks first, and quote them

`npm run push <slug> -- --dry-run`

Report that output verbatim. Do not paraphrase it and do not re-derive it by hand — it
already covers banned words, tired phrases, the service link, block shapes, lengths and
the template marker. Everything below is what it cannot see.

## 2. Invented proof — the highest-value check

Read every sentence containing a number, a name or a claim about the world.

- Is each number either a product specification (10s, 7 days, 2–4 questions) or
  arithmetic the reader performs on their own inputs? Anything else must sit inside a
  `ds-stat` fence with a live source URL.
- Is every named person, company or client real? `lib/work.ts` and `lib/team.ts` in the
  main repo are empty on purpose. A young agency with no case studies is a truthful
  statement; a fabricated one is a lie a buyer catches on the first call.
- Flag any sentence that *implies* experience the agency has not had — "we've seen this
  dozens of times", "most of our clients".

No validation rule can do this. It is the reason this review exists.

## 3. Hypotheticals that do not announce themselves

Grep for `Say you`, `Imagine`, `A typical`, `Suppose`. Then read the paragraphs around
them. The failure is the opposite shape: a hypothetical written in the past tense so it
reads like something that happened. "Last Tuesday it said you had eleven bags" is fine
inside a passage already framed as "Say you run a builders' merchant"; on its own it is
an invented case study.

## 4. Structure

- The mandatory **"When this isn't worth buying"** section exists, and genuinely names
  someone who should not spend money. A section that says "this isn't for you if you
  don't care about growth" is a pitch wearing a disclaimer.
- **Three-line rule**: roughly the first 60–70 words carry a concrete example, not
  throat-clearing.
- **H2 five-second test**: read the H2s alone, in order. Do they carry the argument? If
  they are labels ("Introduction", "The problem"), they fail.
- Exactly one CTA, at the close, to `/contact#diagnosis`. Not three.

## 5. AI tells (`WRITING-GUIDE.md` §2)

Flag each occurrence:

- "not just X, but Y"
- openers: "The truth is", "Here's the thing", "Let's be honest"
- alliterative or adjective triads ("faster, smarter, better")
- "Whether you're a X or a Y…"
- perfectly parallel bullet lists — real thinking is lumpy
- a conclusion that restates instead of asking
- hedging stacks: "can often potentially help"

## 6. Rhythm

Flag any run of three or more consecutive sentences within about 10% of the same length.
Uniform sentence length is the most reliable machine tell left once the vocabulary has
been cleaned up.

## 7. Mechanics

- Service slugs resolve — the twelve in `sanity/lib/services.ts`.
- British English: flag `-ize`, `color`, `optimize`, `analyze`.
- Lead-loss framing ("leads", "leak", "how you get customers") stays confined to the
  Lead Engine. A post on that subject is the sanctioned exception and must link to
  `/lead-engine` rather than re-explaining the product.

## Output

Open with **SHIP** or **FIX FIRST**. Then a numbered list of fixes in severity order,
each quoting the sentence at fault. Then the section-by-section checklist as a table.

Be blunt. A review that says "looks good overall, a few minor notes" is worth nothing to
someone deciding whether to publish.
