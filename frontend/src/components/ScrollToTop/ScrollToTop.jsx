// src/components/ScrollToTop/ScrollToTop.jsx
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();
  const scrollToId = location.state?.scrollToId;

  useLayoutEffect(() => {
    if (scrollToId) return;

    const html = document.documentElement;
    const body = document.body;

    const previousHtmlBehavior = html.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;

    html.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const reset = () => {
      window.scrollTo(0, 0);
      html.scrollTop = 0;
      body.scrollTop = 0;
    };

    reset();

    const raf1 = requestAnimationFrame(reset);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(reset));
    const t1 = setTimeout(reset, 80);
    const t2 = setTimeout(reset, 250);
    const t3 = setTimeout(reset, 600);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      html.style.scrollBehavior = previousHtmlBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    };
  }, [location.pathname, location.search, location.key, scrollToId]);

  return null;
};

export default ScrollToTop;