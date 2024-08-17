import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

const ImageSwiper = ({
  images,
  openIndex,
  onClose,
}: {
  images: EntryItem[];
  openIndex: number;
  onClose: () => void;
}) => {
  const photoSwipeRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const lightbox = useRef<PhotoSwipeLightbox | null>(null);
  useEffect(() => {
    if (photoSwipeRef.current) {
      lightbox.current = new PhotoSwipeLightbox({
        gallery: photoSwipeRef.current,
        children: "a",
        wheelToZoom: true,
        pswpModule: () => import("photoswipe"),
      });
      lightbox.current?.on("close", onClose);

      lightbox.current.init();
    }

    return () => {
      lightbox.current?.destroy();
      lightbox.current = null;
    };
  }, []);

  useEffect(() => {
    if (openIndex !== -1) {
      lightbox.current?.loadAndOpen(openIndex);
    }
  }, [openIndex]);

  return (
    <div className={"image-swiper"} ref={photoSwipeRef}>
      {images.map((image) => (
        <a
          key={image.name}
          href={
            params["*"]
              ? `/file_link/${params["*"]}/${image.name}`
              : `/file_link/${image.name}`
          }
          data-pswp-width={image.width}
          data-pswp-height={image.height}
        ></a>
      ))}
    </div>
  );
};

export default ImageSwiper;
