import type { PostAudio } from "@/lib/types";

/* The spoken version of a post.
 *
 * A native <audio controls>, not a bespoke player. Every browser already ships
 * a player that is keyboard accessible, screen-reader labelled, remembers the
 * user's volume, honours system media keys, appears in the OS media panel, and
 * supports playback-rate control — all of which a hand-rolled one would have to
 * reimplement and mostly wouldn't. It also costs no JavaScript.
 *
 * `preload="none"` matters: an MP3 of a 1,300-word post is a few megabytes, and
 * preloading it on every page view would cost more bandwidth than the article
 * for a feature most readers won't use. Nothing is fetched until Play.
 *
 * The voice is disclosed. If a machine read it, the page says so — passing a
 * synthetic voice off as the founder's would be exactly the invented-person
 * problem the honesty rules exist to prevent. */
export default function AudioPlayer({ audio }: { audio: PostAudio }) {
  const minutes = audio.durationSeconds
    ? Math.max(1, Math.round(audio.durationSeconds / 60))
    : null;

  return (
    <section
      aria-labelledby="listen"
      className="rounded-card border-[1.5px] border-ink bg-paper p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p id="listen" className="text-eyebrow uppercase text-indigo-600">
          Listen instead
        </p>
        {minutes && (
          <p className="text-small text-slate">{minutes} min</p>
        )}
      </div>

      <audio
        controls
        preload="none"
        src={audio.url}
        className="mt-4 w-full"
      >
        {/* Shown only by a browser with no audio support at all. */}
        <a href={audio.url} download>
          Download the audio version
        </a>
      </audio>

      {audio.voice && (
        <p className="mt-3 text-small text-slate">
          Read by {audio.voice}.
        </p>
      )}
    </section>
  );
}
