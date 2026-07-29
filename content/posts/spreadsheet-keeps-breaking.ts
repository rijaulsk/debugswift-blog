import { localImage } from "@/sanity/lib/cloudinary";
import type { Post } from "@/lib/types";
import { rijaul } from "@/content/authors";
import { automatingBusywork } from "@/content/topics";
import {
  bullets,
  callout,
  faqBlock,
  h2,
  para,
  serviceLink,
  steps,
  table,
} from "@/content/helpers";

/* Post two. Written to WRITING-GUIDE.md — the same structure the Studio's body
 * template scaffolds and the same rules sanity/lib/rules.ts enforces.
 *
 * The title is the example the content guidelines themselves use for a good
 * owner question, which is why it was worth writing properly rather than
 * leaving as an illustration in a document.
 *
 * No statistics, again. Everything numeric here is either the reader's own
 * arithmetic or a description of their own file. */
export const spreadsheetKeepsBreaking: Post = {
  slug: "why-does-my-spreadsheet-keep-breaking",
  title: "Why does my spreadsheet keep breaking?",

  excerpt:
    "It isn't the spreadsheet. It's that a tool built for one person doing sums is now the system three people run the business on.",

  shortAnswer:
    "A spreadsheet breaks because it was never a system — it was a calculation that quietly became one. Nothing enforces the rules, so every person fills it in slightly differently, and one dragged cell can rewrite a month. The file is not the problem. The problem is what you are asking it to be.",

  keyTakeaways: [
    "A spreadsheet has no idea what a valid entry looks like, so every rule it follows is one a person is remembering.",
    "The breakages cluster in the busiest weeks, because that is when people stop double-checking.",
    "You can tell whether the file has become a system by asking what happens when the person who built it is away.",
    "Most spreadsheets should stay spreadsheets. The ones worth replacing are the ones other people depend on.",
  ],

  cover: localImage(
    "/photos/business-process-automation-flowchart.webp",
    "A hand-drawn process flowchart on paper, with steps boxed and arrows connecting them",
    1400,
    933,
  ),

  publishedAt: "2026-07-29T09:00:00.000Z",
  updatedAt: null,
  topic: automatingBusywork,
  author: rijaul,
  isGuest: false,
  noindex: false,
  seoTitle: null,
  seoDescription: null,
  readingMinutes: 6,
  sources: [],
  audio: null,

  faqs: [
    {
      question: "Would moving it to Google Sheets fix this?",
      answer:
        "It fixes one thing — several people can be in it at once without emailing versions around. It doesn't fix any of the rest, because the file still has no idea what a valid entry looks like. If your problem is version chaos, that move is worth making today and costs nothing. If your problem is that the numbers are wrong, it changes nothing.",
    },
    {
      question: "Can't I just lock the cells?",
      answer:
        "You can, and you should — protecting formula cells and adding dropdown validation to the columns people type in will stop a good share of the damage in an afternoon. What it won't do is make the file tell you something is missing, chase anyone, or keep a record of who changed what. Locking is a patch on a good spreadsheet, not a way to make it software.",
    },
    {
      question: "How do I know it's time to replace it?",
      answer:
        "When someone other than its author depends on it being right. A file one person uses to think with is a spreadsheet doing its job. A file three people update and a fourth invoices from is a system, and it's being held together by everyone remembering the same set of unwritten rules on their busiest day.",
    },
  ],

  body: [
    para(
      "Say you run a small builders' merchant. Someone built a stock sheet four years ago — a few columns, a couple of formulas, nothing clever. It worked.",
    ),
    para(
      "Last Tuesday it said you had eleven bags of a product you'd sold out of on Friday. Someone had inserted a row halfway down and a SUM range didn't follow it. Nobody noticed for four days, because nothing about the file looks wrong when it is wrong.",
    ),
    para(
      "That is the whole shape of the problem. The spreadsheet is not broken — it did exactly what it was told. It simply has no idea what it is for, so it cannot tell when the answer stops making sense.",
    ),

    h2("It stopped being a spreadsheet a while ago"),
    para(
      "Almost every one of these files starts as a calculation. One person, working something out, keeping a note of it.",
    ),
    para(
      "Then somebody else needs the number. Then a column gets added so it can answer a second question. Then a tab appears for last year. Then someone builds an invoice from it. At no point does anyone decide to build a system — but by the end, three people depend on a file that was designed for one.",
    ),
    para(
      "Nobody notices the crossing point, which is why nobody plans for it. The file that broke on Tuesday had been a system for about three years.",
    ),

    h2("Why it breaks when you are busiest"),
    para(
      "Notice when these failures actually happen. Not on quiet Wednesdays — during the week everyone was flat out.",
    ),
    para(
      "That is not bad luck. A spreadsheet's rules live in people's heads: paste values not formulas, add rows above the total, use the dropdown, always fill in the date column. Every one of those is a thing someone is remembering. Remembering is the first thing to go when you are behind.",
    ),
    para(
      "Software has the opposite property. A form that refuses to submit without a date is just as stubborn in December as in June. That is genuinely the whole difference — not that software is cleverer, but that it does not get tired.",
    ),

    ...bullets([
      "**No validation.** The file will happily accept \"tomorrow\" in a date column, or a negative quantity, or a supplier that doesn't exist.",
      "**No audit trail.** When a number is wrong, there is usually no way to find out when it changed or who changed it.",
      "**Formulas that move.** Insert a row, drag a corner, sort a column with one cell selected — each of these can silently rewrite the file's logic.",
      "**One author.** The rules were never written down because the person who knew them was always in the room.",
    ]),

    h2("The question that tells you which kind you have"),
    para(
      "Most spreadsheets are fine and should be left alone. Only one kind is worth spending money on, and there is a quick way to tell them apart.",
    ),

    steps("Work out whether your file has become a system", [
      {
        title: "Name everyone who opens it",
        text: "Not who could — who actually does, in a normal month. One person is a spreadsheet. Three is a system.",
      },
      {
        title: "Ask what breaks if it is wrong for a week",
        text: "Nothing much, or an order goes out short and a customer finds out before you do? The second one is a system.",
      },
      {
        title: "Ask what happens when its author is on holiday",
        text: "If the honest answer is that everyone waits, or that someone makes a copy and works in that, the rules live in one head and the file is already fragile.",
      },
      {
        title: "Count the manual steps between it and the money",
        text: "Every retype between the sheet, the invoice and the accounts is a place a number can change on the way. Count them. That count is your real risk, and it is a number you can act on.",
      },
    ]),

    para(
      "A typical result: two of the four point one way and two the other. That usually means the file is on the crossing point right now — which is the cheapest moment to do something, and the moment almost everyone waits past.",
    ),

    h2("What replacing it actually looks like"),
    para(
      "Not a rebuild of everything. The useful version is narrow: take the process the sheet is holding together, write it down properly — often for the first time — and give it somewhere to live that enforces its own rules.",
    ),

    table(
      "The three honest options, and what each one really buys you.",
      ["Option", "What it fixes", "What it doesn't"],
      [
        [
          "Tidy the spreadsheet",
          "Locked formulas, dropdowns, one shared copy — an afternoon's work",
          "Nothing chases anyone, nothing is recorded, one head still holds the rules",
        ],
        [
          "An off-the-shelf tool",
          "Proper validation and history, no build cost",
          "Your process has to bend to fit it, and the last 20% usually doesn't",
        ],
        [
          "A small custom tool",
          "The process as you actually run it, with the rules enforced",
          "Costs more than an afternoon, and is overkill for a file two people use",
        ],
      ],
    ),

    para(
      "The order matters. Tidying first is nearly always right, because it is cheap and it tells you whether the mess was the file or the process. If it breaks again a month later, you have learned something worth knowing.",
    ),

    callout(
      "Write the process down before you automate it",
      "Half the value shows up here, before anyone builds anything. Most businesses have never seen their own process on one page, and when they do, two of the steps turn out to be unnecessary.",
      "note",
    ),

    serviceLink(
      "business-process-automation",
      "This is the discipline: mapping the process the spreadsheet has been holding together, then rebuilding it so software does the remembering.",
    ),

    h2("When this isn't worth buying"),
    para("Often it genuinely is not, and it is cheaper to hear that now."),
    ...bullets([
      "**One person uses it.** A file you use to think with is a spreadsheet doing its job. Leave it alone.",
      "**The process changes every month.** Automate a process after it settles, not before — otherwise you are paying to set the wrong thing in concrete.",
      "**It has never actually cost you anything.** If it goes wrong twice a year and someone spots it the same day, that is a working system with rough edges, not a problem worth a budget.",
      "**You haven't tried locking it down yet.** Do the afternoon's work first. Sometimes that is the whole fix, and it costs nothing to find out.",
    ]),
    para(
      "Replacing a spreadsheet that was never really a problem is one of the more expensive ways to feel organised.",
    ),

    h2("So: how many people opened it last week?"),
    para(
      "Open the file and look at the sharing list, or just think about who asked you for a number from it.",
    ),
    para(
      "If the answer is one, this is not your bug and you have just saved yourself a purchase. If the answer is three, and one of them invoices from it, you are running the business on a document that cannot tell you when it is wrong — and you found that out in under a minute.",
    ),
    para(
      "If you would rather work out whether it is worth fixing at all before spending anything, [the free diagnosis](https://debugswift.com/contact#diagnosis) does exactly that, and quite often the answer is to tidy the file and leave it be.",
    ),

    faqBlock([
      {
        question: "What if we've already outgrown two tools?",
        answer:
          "Then the useful question is which 20% they each missed, because that is usually the same 20% — and it is a description of the thing you actually need. Bring both tools and the spreadsheet to the conversation; the pattern is normally obvious within twenty minutes.",
      },
      {
        question: "Do we lose the history in the sheet?",
        answer:
          "No. Importing what is already there is part of the job, not an extra. A tool that starts empty asks everyone to keep the old file open beside it, and then you have two systems instead of one.",
      },
    ]),
  ],
};
