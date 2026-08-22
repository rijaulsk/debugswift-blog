import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getPost, getPostIndex } from "@/lib/content";

/* The share card for a post that has no photograph.
 *
 * Every link anyone posts to WhatsApp, LinkedIn or Slack shows one of these, and
 * until now they all showed the same generic public/og.png — so twenty posts
 * looked like twenty copies of the same thing.
 *
 * CODED, NOT GENERATED, and that is the whole argument: a share card has to be
 * legible as a thumbnail, which means it needs the TITLE in it. A photograph
 * with no text is worse here, not better. debugswift-assets/IMAGE-PROMPTS.md §8
 * already puts this class of asset in the "coded, not generated" list.
 *
 * lib/seo.ts decides when this is used: a real Cloudinary cover wins, because a
 * photograph someone chose beats a card a computer laid out. This is the
 * fallback, and most posts will use it.
 *
 * WHY .otf AND NOT THE .woff2 THE SITE USES. Satori — what draws this — cannot
 * read woff2, which is the only format public/fonts held until now. That is why
 * lib/seo.ts used to say a generated card was not worth building. Two static
 * weights now sit beside the variable woff2 purely for this route; the browser
 * still loads the woff2 and never touches these. Static instances, not the
 * variable file, because Satori's variable-font support is unreliable.
 */

export const dynamic = "force-static";

const CREAM = "#f7f3eb";
const SAND = "#ece7df";
const INK = "#221d17";
const STONE = "#a8a49e";
const CLAY = "#e87d4a";
const CIRCUIT = "#c9d1ff";

const WIDTH = 1200;
const HEIGHT = 630;

export async function generateStaticParams() {
  const index = await getPostIndex();
  return index.filter((entry) => !entry.noindex).map((entry) => ({ slug: entry.slug }));
}

const fontFile = (name: string) => readFile(join(process.cwd(), "public", "fonts", name));

/** Long titles have to shrink or they run off the card. */
function titleSize(title: string): number {
  if (title.length <= 38) return 76;
  if (title.length <= 55) return 64;
  if (title.length <= 75) return 54;
  return 46;
}

/* The circuit motif from the brand guide: thin single-weight traces with
 * right-angle bends and small solder-pad dots, very low opacity. A watermark,
 * never a motherboard. Satori has no SVG paths worth trusting, so it is built
 * from positioned rectangles and dots. */
function circuit() {
  const trace = (style: Record<string, string | number>) => ({
    position: "absolute" as const,
    background: CIRCUIT,
    ...style,
  });
  const pad = (left: number, top: number) => ({
    position: "absolute" as const,
    left,
    top,
    width: 10,
    height: 10,
    borderRadius: 5,
    background: CIRCUIT,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        opacity: 0.28,
      }}
    >
      <div style={trace({ left: 880, top: 0, width: 1.5, height: 150 })} />
      <div style={trace({ left: 880, top: 148, width: 190, height: 1.5 })} />
      <div style={trace({ left: 1068, top: 148, width: 1.5, height: 120 })} />
      <div style={pad(1064, 264)} />

      <div style={trace({ left: 980, top: 630 - 210, width: 1.5, height: 210 })} />
      <div style={trace({ left: 980, top: 630 - 210, width: 140, height: 1.5 })} />
      <div style={pad(1116, 630 - 215)} />

      <div style={trace({ left: 0, top: 500, width: 120, height: 1.5 })} />
      <div style={trace({ left: 118, top: 500, width: 1.5, height: 130 })} />
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return new Response("Not found", { status: 404 });

  const [bold, medium] = await Promise.all([
    fontFile("Satoshi-Bold.otf"),
    fontFile("Satoshi-Medium.otf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CREAM,
          /* Never a white page, and never #000 text. */
          color: INK,
          fontFamily: "Satoshi",
          padding: "68px 72px",
          position: "relative",
        }}
      >
        {circuit()}

        {/* Eyebrow above the title, per the design system. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* The single clay moment on the card. */}
          <div style={{ width: 34, height: 6, borderRadius: 3, background: CLAY }} />
          <div
            style={{
              fontFamily: "Satoshi Medium",
              fontSize: 24,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: STONE,
            }}
          >
            {post.topic?.title ?? "The DebugSwift blog"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titleSize(post.title),
            lineHeight: 1.12,
            letterSpacing: -1.5,
            /* Left-anchored and asymmetric — the right third stays empty so the
             * circuit motif has somewhere to breathe. */
            maxWidth: 880,
          }}
        >
          {post.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontFamily: "Satoshi Medium",
              fontSize: 26,
              color: INK,
            }}
          >
            debugswift.com/blog
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Satoshi Medium",
              fontSize: 22,
              /* Ink, not stone. Stone on sand is the contrast pairing the
               * Lighthouse pass keeps catching, and a share card is read at
               * thumbnail size where it is worse still. */
              color: INK,
              background: SAND,
              border: `1.5px solid ${INK}`,
              borderRadius: 14,
              padding: "8px 18px",
            }}
          >
            {post.readingMinutes} min read
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Satoshi", data: bold, weight: 700, style: "normal" },
        { name: "Satoshi Medium", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
