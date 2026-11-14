import { Accessor, createEffect, onCleanup } from "solid-js";
import { useParams } from "@solidjs/router";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { fileLinkUrl, decodePath, joinPath } from "@/lib/path";

const createPhotoSwipe = ({
  images,
  openIndex,
  onClose,
}: {
  images: Accessor<FileEntryItem[] | undefined>;
  openIndex: Accessor<number | undefined>;
  onClose: () => void;
}) => {
  const params: { path?: string } = useParams();
  let lightbox: PhotoSwipeLightbox | null = null;
  const dirPath = () => decodePath(params.path ?? "");

  createEffect(() => {
    const list = images();
    if (!list?.length) {
      return;
    }

    const current = new PhotoSwipeLightbox({
      dataSource: list.map((image) => ({
        id: image.name,
        src: fileLinkUrl(joinPath(dirPath(), image.name)),
        width: image.width ?? 1,
        height: image.height ?? 1,
      })),
      wheelToZoom: true,
      showHideAnimationType: "zoom",
      pswpModule: () => import("photoswipe"),
    });
    current.on("close", onClose);
    current.init();
    lightbox = current;

    onCleanup(() => {
      current.destroy();
      if (lightbox === current) {
        lightbox = null;
      }
    });
  });

  createEffect(() => {
    const index = openIndex();
    if (index !== undefined && lightbox) {
      lightbox.loadAndOpen(index);
    }
  });
};

export default createPhotoSwipe;
