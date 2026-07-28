import Image from "next/image";
import Link from "next/link";
import { BLOG } from "@/lib/links";
import type { Author } from "@/lib/types";

/* The byline block at the foot of a post.
 *
 * This is the E-E-A-T surface: who wrote it, what they do, and where else they
 * can be found. It is also where the honesty rules bite hardest — `photo` is
 * null until a real photograph of a real person exists, and the fallback is a
 * monogram, never a stock portrait or a generated face. An initial is a
 * truthful placeholder; a face that belongs to nobody is not.
 *
 * Guest links carry rel="nofollow ugc". That is set from author.isGuest with no
 * per-link override, here and in the post body — it is the thing that lets a
 * guest section exist without the domain becoming a link market. */
export default function AuthorBox({ author }: { author: Author }) {
  const rel = author.isGuest ? "nofollow ugc noopener" : "noopener";

  return (
    <aside className="rounded-card border-[1.5px] border-ink bg-paper p-6">
      <p className="text-eyebrow uppercase text-indigo-600">
        {author.isGuest ? "Guest contributor" : "Written by"}
      </p>

      <div className="mt-4 flex items-start gap-4">
        {author.photo ? (
          <Image
            src={author.photo.src}
            alt={author.photo.alt}
            width={56}
            height={56}
            sizes="56px"
            className="h-14 w-14 shrink-0 rounded-full border-[1.5px] border-ink object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-sand text-h3 font-bold text-indigo-600"
          >
            {author.name.charAt(0)}
          </span>
        )}

        <div>
          <p className="font-bold text-ink">
            <Link
              href={BLOG.author(author.slug)}
              className="underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              {author.name}
            </Link>
          </p>
          <p className="text-small text-stone">{author.role}</p>
          {author.bio && <p className="mt-2 text-small text-slate">{author.bio}</p>}

          {author.links.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {author.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel={rel}
                    className="text-small font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {author.isGuest && (
        /* Disclosure, not decoration. A reader should be able to tell whose
         * opinion they just read without checking the byline's colour. */
        <p className="mt-4 border-t-[1.5px] border-mist pt-4 text-small text-stone">
          This is a guest post. It was reviewed and edited before publishing, but
          the views and any recommendations are the author&apos;s own.
        </p>
      )}
    </aside>
  );
}
