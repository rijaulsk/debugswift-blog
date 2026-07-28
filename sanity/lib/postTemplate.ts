/* The post skeleton, as the initial value of every new post's body.
 *
 * A template that exists as a document nobody opens is a template nobody uses.
 * This one is already in the editor when a post is created, so the structure is
 * the path of least resistance rather than something to remember.
 *
 * The shape is the one in WRITING-GUIDE.md, which is also the shape of the
 * prompt handed to an AI assistant. All three have to agree — change one,
 * change all three.
 *
 * Every instruction line starts with TEMPLATE_MARKER, and a validation rule on
 * the body rejects any post that still contains it. That is the safety net for
 * the obvious failure mode: publishing the scaffolding. */

export const TEMPLATE_MARKER = "TEMPLATE —";

let n = 0;
const key = () => `tpl${(n += 1)}`;

const para = (text: string) => ({
  _type: "block",
  _key: key(),
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: key(), text, marks: [] }],
});

const h2 = (text: string) => ({
  _type: "block",
  _key: key(),
  style: "h2",
  markDefs: [],
  children: [{ _type: "span", _key: key(), text, marks: [] }],
});

export function postBodyTemplate() {
  /* Rebuilt per call so two posts created in one session don't share _keys. */
  n = 0;
  return [
    para(
      `${TEMPLATE_MARKER} Open on a concrete moment in the reader's week. One scene, named and specific — a time of day, a real object, a message nobody answered. No throat-clearing and no "in today's business landscape". Replace this paragraph.`,
    ),
    para(
      `${TEMPLATE_MARKER} Second paragraph: what went wrong in that scene, still concrete. The reader should recognise their own week by now.`,
    ),
    para(
      `${TEMPLATE_MARKER} Third paragraph: name the actual problem in one sentence, and say what this post is going to do about it.`,
    ),

    h2(`${TEMPLATE_MARKER} Why this happens — a heading that passes the five-second test`),
    para(
      `${TEMPLATE_MARKER} The mechanism, in the owner's language. Not the technology.`,
    ),

    h2(`${TEMPLATE_MARKER} What it actually costs`),
    para(
      `${TEMPLATE_MARKER} The cost of leaving it alone. Use the reader's own arithmetic — never an invented statistic. If you cite a real one, use a Sourced statistic block so the source is published with it.`,
    ),

    h2(`${TEMPLATE_MARKER} How to find out for yourself`),
    para(
      `${TEMPLATE_MARKER} Something the reader can do this week with what they already have. A Steps block here compiles into HowTo structured data — use it if the procedure is genuine.`,
    ),

    h2(`${TEMPLATE_MARKER} What a fix looks like`),
    para(
      `${TEMPLATE_MARKER} What good looks like, described plainly. Add a Service link block below this — every post links at least one service page, and validation will block publishing without one.`,
    ),

    h2(`${TEMPLATE_MARKER} When this isn't worth buying`),
    para(
      `${TEMPLATE_MARKER} Mandatory section. Say plainly who should NOT spend money on this and why. This is the paragraph competitors are afraid to write, and it is the reason anyone believes the rest.`,
    ),

    h2(`${TEMPLATE_MARKER} Closing question`),
    para(
      `${TEMPLATE_MARKER} End on the diagnosis question — something the reader can answer about their own business in ninety seconds. Then one CTA, linked inline to https://debugswift.com/contact#diagnosis. One. Not three.`,
    ),
  ];
}
