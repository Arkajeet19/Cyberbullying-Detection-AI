import { useEffect, useRef, useState } from "react";

/** Returns [ref, inView] -- inView flips to true once, the first time the
 * ref'd element enters the viewport, and never resets. Used to drive
 * scroll-triggered reveals without re-triggering on scroll-back. */
export function useInViewOnce(options = { threshold: 0.3 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || inView) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}
