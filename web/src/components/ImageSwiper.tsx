import { Accessor, createEffect, onCleanup, onMount } from "solid-js";
import { useParams } from "@solidjs/router";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

const ImageSwiper = ({
  images,
  openIndex,
  onClose,
}: {
  images: FileEntryItem[];
  openIndex: Accessor<number | undefined>;
  onClose: () => void;
}) => {
  const { path }: { path: string } = useParams();
  let photoSwipeRef: HTMLDivElement | undefined;
  let lightbox: PhotoSwipeLightbox | null;
  onMount(() => {
    if (photoSwipeRef) {
      lightbox = new PhotoSwipeLightbox({
        // gallery: photoSwipeRef,
        // children: "a",
        dataSource: images.map((image) => ({
          id: image.name,
          src: path
            ? `/file_link/${path}/${image.name}`
            : `/file_link/${image.name}`,
          width: image.width,
          height: image.height,
        })),
        wheelToZoom: true,
        showHideAnimationType: "zoom",
        pswpModule: () => import("photoswipe"),
      });
      lightbox.on("close", onClose);
      lightbox.init();
    }
  });
  onCleanup(() => {
    lightbox?.destroy();
    lightbox = null;
  });
  createEffect(() => {
    const index = openIndex();
    if (index !== undefined) {
      lightbox?.loadAndOpen(index);
    }
  });
  return (
    <div class={"image-swiper"} ref={photoSwipeRef}>
      {images.map((image) => (
        <a
          href={
            path
              ? `/file_link/${path}/${image.name}`
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
