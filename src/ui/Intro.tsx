/**
 * The opening.
 *
 * Fifteen seconds of the premise: your inherited ship sitting in the yard
 * behind the house while somebody else is already burning for orbit.
 *
 * Rules this component must never break:
 *  - it is always skippable, on the first tap, key, or click;
 *  - if the video cannot play for any reason — autoplay blocked, file missing,
 *    codec refused — it gets out of the way immediately rather than trapping
 *    the player behind a black screen;
 *  - reduced-motion users never see it at all.
 */

import { useEffect, useRef, useState } from 'react';

/** How long to wait for the video to show signs of life before giving up. */
const START_TIMEOUT_MS = 2500;

/**
 * A normal file sitting beside the page, so it streams as it plays rather than
 * loading whole. The offline single-file build has no sibling files, so there
 * the video is simply absent — onError fires and the title screen loads with
 * no fuss. The opening belongs to the hosted version.
 */
const INTRO_SRC = './intro.mp4';

export function Intro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const doneRef = useRef(false);
  const [showSkip, setShowSkip] = useState(false);

  // One-way exit, so a tap and the video ending cannot both fire it.
  const finish = (): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      finish();
      return;
    }

    const video = videoRef.current;
    if (!video) {
      finish();
      return;
    }

    // Autoplay is refused in plenty of situations. If it is, do not argue —
    // the game is the point, not the intro.
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => finish());
    }

    // Belt and braces: if nothing is playing shortly after mount, move on.
    const guard = window.setTimeout(() => {
      if (video.currentTime <= 0 || video.paused) finish();
    }, START_TIMEOUT_MS);

    // The skip hint appears after a beat so it does not step on the first shot.
    const hint = window.setTimeout(() => setShowSkip(true), 1800);

    const onKey = (): void => finish();
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(guard);
      window.clearTimeout(hint);
      window.removeEventListener('keydown', onKey);
    };
    // finish is stable via the ref guard; this runs once.

  }, []);

  return (
    <div
      className="intro"
      onClick={finish}
      onTouchStart={finish}
      role="button"
      tabIndex={0}
      aria-label="Skip the opening"
    >
      <video
        ref={videoRef}
        className="intro__video"
        src={INTRO_SRC}
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        onStalled={finish}
      />

      {/* Vignette and a floor of black so the frame edges do not read as a box. */}
      <div className="intro__vignette" />

      {showSkip && <div className="intro__skip">Tap to skip</div>}
    </div>
  );
}
