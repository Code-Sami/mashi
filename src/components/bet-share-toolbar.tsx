"use client";

import { useCallback, useState, type RefObject } from "react";
import { toPng } from "html-to-image";

type BetShareToolbarProps = {
  /** Absolute URL to the market page — attached when sharing the image */
  marketAbsoluteUrl: string;
  captureRef: RefObject<HTMLElement | null>;
  /** Result/share settlement cards use “View…”; post-bet uses “Join…” */
  linkPhrasing?: "join" | "view";
};

/**
 * `html-to-image` builds an SVG → canvas snapshot of the capture node. By default it
 * sizes the snapshot from `clientHeight`, which can be shorter than full content under
 * flex/grid; that clips the bottom. We pass explicit `width` / `height` from
 * `scrollWidth` / `scrollHeight` (library applies them to the cloned root — see
 * `apply-style.js`) so the foreignObject matches the full painted tree.
 */
async function nodeToPngBlob(node: HTMLElement): Promise<Blob> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const width = Math.ceil(node.scrollWidth);
  const height = Math.ceil(node.scrollHeight);

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
    width,
    height,
    style: {
      overflow: "hidden",
      margin: "0",
      padding: "0",
      display: "block",
    },
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

/** One string so targets like WhatsApp use it as the image caption (avoid `url` + `text` duplicating the link). */
function shareCaption(marketAbsoluteUrl: string, linkPhrasing: "join" | "view") {
  const lead =
    linkPhrasing === "view" ? "View this market on Mashi" : "Join this market on Mashi";
  return `${lead}\n${marketAbsoluteUrl}`;
}

export function BetShareToolbar({
  marketAbsoluteUrl,
  captureRef,
  linkPhrasing = "join",
}: BetShareToolbarProps) {
  const [busy, setBusy] = useState(false);

  const handleShareImage = useCallback(async () => {
    const el = captureRef?.current;
    if (!el) return;
    setBusy(true);
    const caption = shareCaption(marketAbsoluteUrl, linkPhrasing);
    try {
      const blob = await nodeToPngBlob(el);
      const file = new File([blob], "mashi-bet.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Mashi",
          text: caption,
        });
        return;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Mashi",
            text: caption,
          });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(caption);
    } catch {
      try {
        await navigator.clipboard.writeText(caption);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }, [captureRef, marketAbsoluteUrl, linkPhrasing]);

  return (
    <button
      type="button"
      onClick={handleShareImage}
      disabled={busy}
      className="w-full rounded-xl bg-brand-dark py-3 text-sm font-semibold text-white transition hover:bg-brand-dark-light disabled:opacity-60"
    >
      {busy ? "Preparing…" : "Share"}
    </button>
  );
}
