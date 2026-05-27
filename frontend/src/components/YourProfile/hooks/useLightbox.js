import { useCallback, useState } from "react";

const useLightbox = () => {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const openLightbox = useCallback((src) => {
    setFullscreenImage(src || null);
  }, []);

  const closeLightbox = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  return {
    fullscreenImage,
    openLightbox,
    closeLightbox,
  };
};

export default useLightbox;