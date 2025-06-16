import { Accessor, createEffect, onCleanup, onMount } from "solid-js";
import { useParams } from "@solidjs/router";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

const createPhotoSwipe = ({
  images,
  openIndex,
  onClose,
}: {
  images: Accessor<FileEntryItem[] | undefined>;
  openIndex: Accessor<number | undefined>;
  onClose: () => void;
}) => {
  let lightbox: PhotoSwipeLightbox | null;
  createEffect(() => {
    const { path }: { path?: string } = useParams();
    images()?.length &&
      onMount(() => {
        lightbox = new PhotoSwipeLightbox({
          dataSource: images()?.map((image) => ({
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
      });
    onCleanup(() => {
      lightbox?.destroy();
      lightbox = null;
    });
  });
  createEffect(() => {
    const index = openIndex();
    if (index !== undefined) {
      lightbox?.loadAndOpen(index);
    }
  });
};

export default createPhotoSwipe;
