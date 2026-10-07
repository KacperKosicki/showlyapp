import { useEffect, useRef } from "react";

export default function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const elements = ref.current?.querySelectorAll('[data-reveal]') || [];
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.revealState = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(element => {
      element.dataset.revealState = 'pending';
      observer.observe(element);
    });
    return () => {
      observer.disconnect();
      elements.forEach(element => delete element.dataset.revealState);
    };
  }, []);
  return ref;
}
