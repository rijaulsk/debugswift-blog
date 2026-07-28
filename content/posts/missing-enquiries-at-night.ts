import { localImage } from "@/sanity/lib/cloudinary";
import type { Post } from "@/lib/types";
import { rijaul } from "@/content/authors";
import { answeringEnquiries } from "@/content/topics";
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

/* The demo post. Real, publishable copy — not placeholder text.
 *
 * Written against debugswift-assets/content-guidelines.md §Blog-specific:
 * one owner question as the title, 800–1,500 words, one idea, a concrete
 * example inside the first three paragraphs, hypotheticals that open "Say you
 * run…" / "A typical…", H2s that pass the five-second test, closing on the
 * diagnosis question with one CTA, and links to at least one service page.
 *
 * Two honesty constraints shaped what is NOT here:
 *   · No statistics. Every number below is either a product spec (10 seconds,
 *     7 days, 2–4 questions) or arithmetic the reader does on their own inputs.
 *     The sourcedStat block exists in the schema and is deliberately unused —
 *     citing a figure whose source I could not verify would be the invented
 *     proof the rules forbid.
 *   · No results, no client, no testimonial. The scenarios are labelled as
 *     hypotheticals in their opening words.
 *
 * Lead-loss framing is confined to the Lead Engine product page everywhere on
 * the main site. This post is the sanctioned exception (CLAUDE.md), and it
 * links there rather than re-explaining the product. */
export const missingEnquiriesAtNight: Post = {
  slug: "why-do-i-keep-missing-enquiries-at-night",
  title: "Why do I keep missing enquiries at night?",

  excerpt:
    "Enquiries arrive after hours because that's when your customers are free. Here's what happens to them while you sleep, and what it costs to leave that gap open.",

  shortAnswer:
    "Enquiries arrive at night because that is when your customers are finally free to send them. Nobody replies until morning, so by then the sender has usually messaged two competitors as well. The gap is not a staffing problem — it is an unanswered message sitting on a phone for nine hours.",

  keyTakeaways: [
    "Most after-hours enquiries are not urgent to you, but they are open to the sender — who keeps contacting businesses until one replies.",
    "The cost of the gap is not the enquiry you lost; it is the enquiries you never knew arrived, because nothing logs them.",
    "You can measure the gap in one week with nothing more than your own phone and a sheet of paper.",
    "Answering fast does not require hiring anyone, and it does not require pretending a human is on the other end.",
  ],

  cover: localImage(
    "/photos/whatsapp-lead-engine-phone-checklist.webp",
    "A phone showing a WhatsApp enquiry thread, resting on a handwritten checklist of jobs to reply to",
    1600,
    1067,
  ),

  publishedAt: "2026-07-28T09:00:00.000Z",
  updatedAt: null,
  topic: answeringEnquiries,
  author: rijaul,
  isGuest: false,
  noindex: false,
  seoTitle: null,
  seoDescription: null,
  readingMinutes: 6,

  sources: [],

  faqs: [
    {
      question: "Will customers be annoyed that a machine answered them?",
      answer:
        "Not if it says so. The complaint people have is being ignored, not being answered by software. An assistant that introduces itself honestly, answers the question, and says when a human will follow up reads as organised. One that pretends to be you reads as a trick, and gets caught the moment someone asks it something specific.",
    },
    {
      question: "What if the enquiry is complicated?",
      answer:
        "Then it gets captured rather than answered. The useful job at 11pm is not resolving the enquiry — it is acknowledging it, asking the two or three questions you would have asked anyway, and putting the answers in front of you before your first coffee. You start the conversation informed instead of starting it cold.",
    },
    {
      question: "Isn't this just an auto-reply?",
      answer:
        "An auto-reply says \"we've received your message\" and stops. It buys a few minutes of goodwill and collects nothing. The difference is what happens next: whether the sender is asked what they actually need, whether the answer is recorded somewhere you will see it, and whether you can tell on Monday how many enquiries arrived over the weekend.",
    },
  ],

  body: [
    para(
      "Say you run a repair shop. At 11pm on a Tuesday, someone whose washing machine has just flooded their kitchen finds you on Google and sends a message: “Do you do emergency callouts? What would it cost?”",
    ),
    para(
      "You are asleep. You reply at 8:40 the next morning. By then they have messaged two other shops, and one of them replied at 11:06pm — not because a human was awake, but because something answered on their behalf.",
    ),
    para(
      "That is the whole problem, and it is not really about nights. It is about the gap between when your customers are free to contact you and when you are free to reply. Those two windows barely overlap, and the gap is where enquiries go to die.",
    ),

    h2("Your customers contact you when they are off work, not when you are on"),
    para(
      "People send enquiries in the gaps of their own day: on the sofa after dinner, on the commute, at the point the problem actually becomes annoying. A blocked drain is a nuisance at 4pm and an emergency at 10pm. A quote for a kitchen gets requested on a Sunday because Sunday is when there is time to think about kitchens.",
    ),
    para(
      "None of that lines up with your working hours, and none of it is going to change. Your customers are not being inconsiderate — they are contacting you at the only moment they had.",
    ),
    para(
      "What matters is what greets them. Silence, for nine hours, reads as “this business might not exist any more.” So they hedge, and message someone else too. They are not disloyal; they just have a flooded kitchen.",
    ),

    h2("The cost isn't the lost job — it's the enquiries you never counted"),
    para(
      "Most owners can name the one big job they lost by replying late. Almost nobody can say how many enquiries arrived last month outside working hours, because nothing counted them.",
    ),
    para(
      "That is the expensive part. A missed job you know about is a bad week. A steady leak you cannot see is a business decision you keep making without the information — you cannot weigh hiring, or extending hours, or anything else, against a number you do not have.",
    ),
    para(
      "And the leak is invisible by design. Someone who messages at 11pm and gets a reply from a competitor at 11:06 never tells you they were there. There is no complaint, no bad review, nothing in the inbox to review. It is a customer you never met, so it never enters your thinking.",
    ),

    steps("How to measure your own gap in one week", [
      {
        title: "Write down every enquiry, wherever it lands",
        text: "One sheet of paper, or one note on your phone. Every call, WhatsApp message, form submission, DM, and email that is someone asking to buy something. Nothing clever — just all of them, in one place.",
      },
      {
        title: "Put a time next to each one",
        text: "Not the time you saw it. The time it arrived. Your phone already knows; you are just copying it across.",
      },
      {
        title: "Mark the ones that arrived outside your working hours",
        text: "Evenings, nights, weekends, lunch, anything that sat unread for more than an hour. Count them at the end of the week.",
      },
      {
        title: "Multiply by what one customer is worth to you",
        text: "Your own average job value, not an industry figure. Then assume — conservatively — that you only lose some of them. Whatever number that produces is what the gap is costing you, and it is yours, not a statistic.",
      },
    ]),

    para(
      "Most people who do this are surprised twice: first by how many enquiries arrive after hours, and second by how many of them they had genuinely forgotten about by the time they wrote the list.",
    ),

    h2("Three ways to cover the hours you're not working"),
    para(
      "There are only really three answers, and two of them are worse than they look.",
    ),

    table(
      "The realistic options for covering after-hours enquiries.",
      ["Approach", "What it costs", "What actually happens"],
      [
        [
          "Hire someone for evenings",
          "A salary, plus recruiting and training",
          "Works, and is wildly disproportionate for the volume most small businesses get after hours",
        ],
        [
          "Voicemail or an auto-reply",
          "Almost nothing",
          "Acknowledges the message and collects nothing — you still start Monday with no idea what anyone wanted",
        ],
        [
          "An assistant that answers and asks",
          "A one-off build",
          "Replies in seconds, asks the questions you would have asked, and hands you a qualified enquiry in the morning",
        ],
      ],
    ),

    para(
      "The third option is the only one that closes the gap without changing your hours. It is also the one people are most suspicious of, usually because they have met the bad version — a chatbot that loops, misunderstands, and eventually says “please contact us during business hours.”",
    ),

    h2("What a good one actually does"),
    para(
      "The useful job at 11pm is narrow. It is not closing a sale, and it is not resolving a technical question. It is three things:",
    ),
    ...bullets([
      "**Answer within seconds**, in your wording, so the sender knows they have reached a real business.",
      "**Ask the two to four questions** you would have asked anyway — what, where, when, how urgent.",
      "**Log it somewhere you will see it**, so tomorrow morning you have a qualified enquiry rather than a notification.",
    ]),
    para(
      "A typical outcome: you wake up to “Anita, kitchen tap leaking under the sink, Kolkata, wants someone today, has photos” instead of a missed message at 11:04pm. You have not saved a machine's worth of work — you have saved the twenty minutes of back-and-forth that used to happen before you could even quote.",
    ),

    callout(
      "Honesty matters more than polish here",
      "An assistant that introduces itself as an assistant almost never annoys anyone. One that pretends to be you gets caught within three messages, and that is a worse first impression than not replying at all.",
      "note",
    ),

    serviceLink(
      "ai-automation",
      "This is the discipline behind it — assistants that answer, qualify, and book on WhatsApp, SMS, or your website, in wording you approve line by line.",
    ),

    h2("When this isn't worth buying"),
    para(
      "Sometimes it genuinely is not, and it is worth saying so before you spend anything.",
    ),
    ...bullets([
      "**You get very few enquiries at all.** Then the gap is not your problem — being found is. Fix visibility first; an assistant answering three messages a month is an expensive way to feel organised.",
      "**Your customers only ever phone.** Some trades and some age groups genuinely do not message. Count first, and if the list from that week is all phone calls, this is not your fix.",
      "**Every enquiry is genuinely bespoke.** If no two jobs share a single qualifying question, there is nothing to automate yet. Come back when a pattern exists.",
    ]),
    para(
      "That is not modesty. Buying the wrong fix is how people conclude that technology does not work for their business, and then stop trying the things that would have.",
    ),

    h2("So: what arrived last night?"),
    para(
      "Not a rhetorical question. Open your phone and look at what came in after you stopped working yesterday, and how long it sat there.",
    ),
    para(
      "If the answer is nothing, good — this is not your bug, and you have just saved yourself a purchase. If the answer is three messages and the oldest one has been waiting eleven hours, you have found something worth fixing, and you found it in about ninety seconds.",
    ),
    para(
      "The [Lead Engine](https://debugswift.com/lead-engine) is our packaged version of that fix — one channel, live in 7 days. If you would rather work out whether it is the right fix at all, the diagnosis call does that first, and costs nothing.",
    ),

    faqBlock([
      {
        question: "How fast is fast enough?",
        answer:
          "Seconds, not minutes. The window that matters is however long the sender is still holding their phone — once they have put it down and messaged someone else, a reply four minutes later is competing with a reply that already arrived.",
      },
      {
        question: "Do I need this on every channel at once?",
        answer:
          "No, and starting everywhere is the usual way this gets expensive. Pick the channel your after-hours enquiries actually arrive on — the week of counting tells you which — and cover that one properly first.",
      },
    ]),
  ],
};
