"use client"
import { useCallback, useEffect, useState } from "react";

// Shimmering placeholder that sits over (or under) a media box until the media
// has loaded, then fades away. The box it's in must be positioned.
// Once faded out it unmounts, so its shimmer animation stops running.
export const Skeleton = ({ visible, className = "" }: { visible: boolean; className?: string }) => {
  const [gone, setGone] = useState(!visible);
  if (visible && gone) setGone(false);
  // after the 500ms fade (a timer, since transitionend never fires if the fade is skipped)
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setGone(true), 550);
    return () => clearTimeout(t);
  }, [visible]);
  if (gone) return null;
  return (
    <div
      aria-hidden
      className={`skeleton pointer-events-none absolute inset-0 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
};

// Loaded state for an image or video. `onLoad` goes on an <Image> (next/image
// also fires it for images already in the cache); `videoRef` + `onLoad` (as
// onLoadedData) go on a <video>, and the ref catches one that had its first
// frame before React attached the handler.
export const useLoaded = () => {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && el.readyState >= 2) setLoaded(true);
  }, []);
  return { loaded, onLoad, videoRef };
};
