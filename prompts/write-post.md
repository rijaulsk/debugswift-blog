# Procedure: write a post for the DebugSwift blog

Tool-agnostic on purpose. Claude Code reaches this through
`.claude/skills/write-post/SKILL.md`; Antigravity is pointed at this file directly.
Neither copy holds the rules — they live in `WRITING-GUIDE.md`, and one copy is the
whole point.

## Before writing

1. Read `CLAUDE.md`. Then `WRITING-GUIDE.md` §1 (the prompt), §2 (voice and the AI tells
   to strip), §3 (originality) and §7 (the draft-file format).
2. **Confirm the topic and author slugs exist.** Topics are in the Studio, or
   `content/topics.ts`. The author is almost always `rijaul-sk`. If the topic you want
   is not there, **stop and ask** — never invent one. Topics are pillar pages, capped at
   five deliberately, and `push` will refuse an unknown slug anyway.
3. **If the owner question was not given to you, propose three and stop.** The angle is
   the part that has to come from someone who knows the business. Guessing it is how a
   blog fills up with posts nobody asked for.

## Writing

4. Write `drafts/<slug>.md`. The filename stem must equal the `slug:` in the
   frontmatter. **Never write into `content/`** — once Sanity is connected that folder
   renders nothing, so a file there publishes nothing and looks like it worked.
5. Follow the ten-part structure in `WRITING-GUIDE.md` §1. The section **"When this
   isn't worth buying"** is mandatory and has to genuinely name someone who should not
   spend money. A post without it reads as a pitch.
6. **Never invent a statistic, a client, a testimonial or a person.** Not a plausible
   one, not a hedged one, not "studies show". The only numbers allowed are product
   specifications and arithmetic the reader does on their own inputs. A real, sourced
   figure goes in a `ds-stat` fence, which will not accept one without a live URL.
   Hypotheticals must announce themselves: "Say you run…", "A typical…".
7. Every post links at least one service page — a `ds-service` fence or an inline link
   to `/services/...` or `/lead-engine`. This is a publish requirement, not a
   preference.
8. Re-read against `WRITING-GUIDE.md` §2 before saving: no "not just X, but Y", no "The
   truth is" / "Here's the thing" openers, no adjective triads, no perfectly parallel
   bullets, no conclusion that restates instead of asking.

## Checking

9. `npm run push <slug> -- --dry-run`. Fix every **FAIL**. Every **WARN** needs a reason
   to keep — say the reason out loud rather than ignoring it.
10. Run the content review (`prompts/review-post.md`, or the `content-review` agent in
    Claude Code) and apply what it finds.
11. `npm run push <slug>`.

## Reporting back

12. Say what a **human** still has to do, and do not describe the post as live:
    - upload a cover image and write its alt text
    - run the originality check (`WRITING-GUIDE.md` §3) and fill in the Pre-publish
      checks tab
    - press Publish

    You cannot do any of those three, and you must not claim otherwise. `push` writes an
    unpublished draft and two required fields it is forbidden to fill keep the Publish
    button disabled until a person has done the work.

## Updating a post that is already live

`npm run pull <slug>` first, every time — it writes the file from what is actually in
Sanity. Edit that, then `npm run push <slug> -- --update`. Pushing a stale file would
revert whatever changed in the Studio since, which is why `push` refuses a published
post without the flag.

If push says the Studio copy has been edited by hand, it is telling you the truth: pull
again and re-apply your change. Reach for `--force` only when the file is genuinely the
better copy, and say so when you report back.
