import { useEffect } from "react";

const useScrollToProfileSection = ({ loading, location }) => {
  useEffect(() => {
    const scrollTo = location.state?.scrollToId || "profileWrapper";

    if (loading) return;

    const tryScroll = () => {
      const element =
        document.getElementById(scrollTo) || document.getElementById("scrollToId");

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);
};

export default useScrollToProfileSection;