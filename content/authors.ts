import type { Author } from "@/lib/types";

/* Real people only.
 *
 * The honesty rules are not style guidance here — E:\debugswift\lib\team.ts is
 * deliberately empty and commented to say why, and FOUNDER_PHOTO_READY stays
 * false until a real photograph exists. The same applies to this file: one
 * author, because one person has written anything. No invented contributors, no
 * stock or generated portraits, no titles nobody holds.
 *
 * Guest contributors are real submitters who came through /write-for-us, and
 * they get isGuest: true — which forces rel="nofollow ugc" on every outbound
 * link in their bio and body. */

export const rijaul: Author = {
  slug: "rijaul-sk",
  name: "Rijaul Sk",
  role: "Founder",
  bio: "Founder of DebugSwift, a technology agency in Kolkata working worldwide. Writes about the unglamorous parts of running a business on software — what's worth paying for, what isn't, and how to tell before you spend.",
  links: [{ label: "About Rijaul", url: "https://debugswift.com/about" }],
  isGuest: false,
  /* Stays null until a real photograph exists. Never a generated face. */
  photo: null,
};

export const localAuthors: Author[] = [rijaul];
