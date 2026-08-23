import { localImage } from "@/sanity/lib/cloudinary";
import type { Post } from "@/lib/types";
import { rijaul } from "@/content/authors";
import { buyingTechnology } from "@/content/topics";
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

/* Post three, which takes the blog to the launch bar set in
 * debugswift-assets/blog-repo-spec.md ("never launch with one thin post").
 *
 * This is the blunt-honesty piece the voice is supposed to be built on: it
 * tells a reader how to price-check a quote from a company like ours, and says
 * plainly when a second opinion is a waste of money. Writing it any other way
 * would be an advert for technical-consulting rather than a post about buying
 * technology. */
export const isThisAgencyQuoteTooHigh: Post = {
  slug: "is-this-agency-quote-too-high",
  title: "Is this agency quote too high?",

  excerpt:
    "You can't price-check software the way you'd price-check a boiler. Here's what to look at instead, and when the number is fair.",

  shortAnswer:
    "You usually cannot tell from the number, because there is no market rate to compare it against — the same build can honestly cost wildly different amounts. What you can judge is the quote itself: whether it says what you get, who owns it, what happens when you leave, and what is deliberately not included.",

  keyTakeaways: [
    "A quote you cannot check is not a pricing problem, it is a specification problem — vague scope is what makes the number unjudgeable.",
    "Ask what happens if you cancel halfway and who owns the code and accounts; the answer tells you more than the price does.",
    "Three quotes for different things is not a comparison, and that is what most people end up holding.",
    "A high quote with a clear scope is usually safer than a low one with a vague scope.",
  ],

  cover: localImage(
    "/photos/technical-consulting-verdict-letter.webp",
    "A typed letter of recommendation on a desk beside a pen, with key lines marked",
    1400,
    933,
  ),

  publishedAt: "2026-07-29T11:00:00.000Z",
  updatedAt: null,
  topic: buyingTechnology,
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
      question: "Should I just go with the cheapest?",
      answer:
        "Only if the three quotes describe the same work, and they almost never do. The cheapest quote is usually the one that scoped the least, which means the difference reappears later as change requests — at a point where you have no room to negotiate because switching would mean starting again.",
    },
    {
      question: "Is it rude to ask an agency to break down the price?",
      answer:
        "No, and how someone responds is itself useful information. You are not asking for an hourly timesheet, which nobody can give you honestly upfront. You are asking what the deliverables are and roughly what share of the work each represents. A firm that treats that as an insult is telling you something.",
    },
    {
      question: "What if I've already signed?",
      answer:
        "Then read the exit and ownership clauses today rather than at the point you need them. Knowing whether the code, the domain and the hosting accounts are in your name changes how the rest of the project goes, and it is much easier to fix in week two than in month five.",
    },
  ],

  body: [
    para(
      "Imagine you asked three firms to quote for the same website. One came back with a number, one came back with about four times that number, and one wanted a paid discovery phase before they would say anything at all.",
    ),
    para(
      "You now have three pieces of paper that cannot be compared, a fortnight gone, and a nagging sense that somebody is trying it on. That feeling is reasonable. It is also, usually, wrong.",
    ),
    para(
      "The uncomfortable truth is that software has no market rate. The same brief can honestly cost very different amounts depending on what each firm assumed you meant — which means the number is nearly always the wrong thing to be staring at.",
    ),

    h2("Why the prices are so far apart"),
    para(
      "Ask three builders to quote for a kitchen and you get three numbers within shouting distance of each other, because they are all pricing the same recognisable thing.",
    ),
    para(
      "Software has no equivalent. \"A website for our business\" can mean five pages someone updates twice a year, or it can mean a booking system with logins, payments and a stock feed. Both are honestly described by that sentence. The firms are not quoting different prices for the same work — they are quoting for different work, because the brief let them.",
    ),
    para(
      "So the first thing a wide spread tells you is not that somebody is expensive. It is that your brief was open to interpretation, and each firm resolved that ambiguity in their own direction.",
    ),

    h2("What to read instead of the number"),
    para(
      "The quote itself is the evidence. Four things in it will tell you more than the total ever will.",
    ),

    steps("Read the quote in this order", [
      {
        title: "Find the deliverables list",
        text: "Not the description of the process — the list of things that exist at the end. If you cannot point at the sentence that says what you receive, the price is unjudgeable and every other question is premature.",
      },
      {
        title: "Find what is explicitly excluded",
        text: "A good quote says what it does not cover: content, photography, migrations, integrations, training. A quote with no exclusions has not been thought about, and the exclusions will arrive later as change requests.",
      },
      {
        title: "Find the ownership clause",
        text: "Who owns the code, the domain, the hosting account and the analytics when this is finished? If those sit in the agency's accounts, the price you were quoted is not the price you will pay over five years.",
      },
      {
        title: "Find the exit",
        text: "What happens if you stop after stage two — do you keep what exists, and can someone else pick it up? A build you cannot walk away from is a rental with a purchase price attached.",
      },
    ]),

    para(
      "A quote that answers all four clearly is one you can judge, whatever the number says. A quote that answers none of them is not really a quote; it is a request for trust.",
    ),

    table(
      "The same brief, quoted three ways — and what each spread actually means.",
      ["What you're holding", "What it usually means", "What to do"],
      [
        [
          "Wide spread, vague scopes",
          "The brief was ambiguous and each firm guessed differently",
          "Rewrite the brief with deliverables, then re-quote",
        ],
        [
          "Wide spread, clear scopes",
          "They genuinely proposed different solutions",
          "Compare the solutions, not the prices",
        ],
        [
          "Narrow spread, clear scopes",
          "The work is well understood and the market is telling you the price",
          "Pick on fit and on who you'd rather ring at 6pm",
        ],
      ],
    ),

    h2("The questions that make a quote comparable"),
    para(
      "If you only send one email back, send this one. Ask each firm the same four things and the comparison usually resolves itself:",
    ),
    ...bullets([
      "**What is the smallest useful version of this, and what would that cost?** Anyone who cannot describe a smaller version has not separated what you need from what they'd like to build.",
      "**What are you assuming I mean by this?** The answers will differ wildly, and that difference is the real explanation for the spread.",
      "**What would make this cost more once we start?** A firm that names three risks upfront is a firm that has done this before.",
      "**Who owns everything at the end, and what do I take with me?** The most revealing question on the list, and the one people are most reluctant to ask.",
    ]),

    callout(
      "A high quote with a clear scope beats a low one with a vague scope",
      "The low, vague quote is the one that becomes an argument in month three — at the point where switching means writing off everything you have paid so far, which is exactly when you have no room to negotiate.",
      "warning",
    ),

    h2("When a second opinion is worth paying for"),
    para(
      "Sometimes the honest answer is that you already have what you need to decide, and paying someone to confirm it is a waste of money.",
    ),
    para(
      "It is worth a review when the number is large enough that being wrong actually hurts, when two firms have recommended opposite approaches and both sound plausible, or when you are being asked to commit to a platform you would find expensive to leave. What those share is that the risk is in the decision rather than in the price.",
    ),
    para(
      "It is not worth it when the quote is small, when the work is reversible, or when you have already decided and want reassurance. An honest review might disagree with you, and paying for one you intend to ignore is the most expensive kind of comfort.",
    ),

    serviceLink(
      "technical-consulting",
      "A review of the quote, the plan or the architecture from someone who builds but isn't bidding for this one — a plain-language verdict of fair, padded, or wrong tool.",
    ),

    h2("So: can you find the deliverables in one minute?"),
    para(
      "Open the quote in front of you and look for the sentence that says what you receive at the end. Not what they will do — what will exist.",
    ),
    para(
      "If you find it in a minute, you can judge that quote, and you probably do not need anyone's help to do it. If you cannot find it at all, the problem was never the price, and no amount of comparing numbers is going to fix it.",
    ),
    para(
      "If you would like a second pair of eyes on it before you sign, [the free diagnosis](https://debugswift.com/contact#diagnosis) is twenty minutes and often ends with us telling you the quote looks fair.",
    ),

    faqBlock([
      {
        question: "Won't you just tell me my quote is too high so I hire you instead?",
        answer:
          "That is the obvious risk in asking a builder to review a builder's quote, and it is a fair thing to be suspicious of. It is also why a review is priced to stand alone, and why sometimes the answer is that the quote is fair and you should sign it. An opinion that always says the same thing is not an opinion.",
      },
      {
        question: "What should I bring to that conversation?",
        answer:
          "Whatever exists — the quotes, the emails, screenshots of the current site, or just the story if that is all you have. Half the useful work is putting the three proposals side by side and noticing they are describing three different projects.",
      },
    ]),
  ],
};
