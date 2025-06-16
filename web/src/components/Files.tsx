import { useNavigate, useParams } from "@solidjs/router";
import {
  createMemo,
  createResource,
  createSignal,
  Match,
  Switch,
} from "solid-js";
import request from "@/lib/request";
import mime from "mime";
import FileGrid from "@/components/FileGrid";
import createPhotoSwipe from "@/hooks/createPhotoSwipe";
import { IconLayoutGrid, IconLoader2, IconTable } from "@tabler/icons-solidjs";
import FileTable from "@/components/FileTable";
import ContextMenu from "@/components/ContextMenu";
import BottomSheets from "@/components/BottomSheets";

enum LayoutType {
  Table = "table",
  Grid = "grid",
}

const Files = () => {
  // route
  const params: { path?: string } = useParams();
  const navigate = useNavigate();

  // fetch file list
  const [filesResponse] = createResource(
    () => params.path ?? "",
    (key) => request.get<never, BaseResponse<FileEntryItem[]>>(`/files/${key}`),
  );
  const files = createMemo(() => filesResponse()?.data);
  const images = createMemo(() =>
    files()?.filter((entry) => mime.getType(entry.name)?.startsWith("image/")),
  );

  // photo swipe
  const [openIndex, setOpenIndex] = createSignal<number | undefined>();
  createPhotoSwipe({
    images: images,
    openIndex: openIndex,
    onClose: () => setOpenIndex(undefined),
  });

  // switch grid and table layout
  const [layout, setLayout] = createSignal<LayoutType>(LayoutType.Grid);

  return (
    <>
      <ContextMenu />
      <BottomSheets />
      <div
        class={
          "flex flex-[1] flex-col overflow-auto rounded-md bg-white shadow-sm"
        }
      >
        <div class={"flex h-10 items-center justify-between px-4"}>
          <div class={"left"}></div>
          <div class={"right"}>
            <div
              class={
                "flex h-8 w-16 justify-between overflow-hidden rounded-lg border-2 border-blue-200"
              }
            >
              <button
                onClick={() => {
                  setLayout(LayoutType.Grid);
                }}
                class={`flex h-full w-full cursor-pointer items-center justify-center transition-all hover:bg-blue-300 ${layout() === LayoutType.Grid ? "bg-blue-400" : ""}`}
              >
                <IconLayoutGrid class={"size-9/12"} />
              </button>
              <span class={"w-[2px] bg-blue-200"}></span>
              <button
                onClick={() => {
                  setLayout(LayoutType.Table);
                }}
                class={`flex h-full w-full cursor-pointer items-center justify-center transition-all hover:bg-blue-300 ${layout() === LayoutType.Table ? "bg-blue-400" : ""}`}
              >
                <IconTable class={"size-9/12"} />
              </button>
            </div>
          </div>
        </div>
        <div class={"flex-[1] overflow-auto"}>
          <Switch>
            <Match when={filesResponse.loading}>
              <div class={"flex h-full w-full items-center justify-center"}>
                <IconLoader2 class={"size-12 animate-spin"} />
              </div>
            </Match>
            <Match when={files()}>
              <div class={"p-4"}>
                <Switch>
                  <Match when={layout() === LayoutType.Grid}>
                    <FileGrid
                      files={files}
                      onEntryClick={(entry) => {
                        if ((entry.entryType as string) === "Directory") {
                          navigate(
                            params.path
                              ? `/browse/${params.path}/${entry.name}`
                              : `/browse/${entry.name}`,
                          );
                        } else if (
                          mime.getType(entry.name)?.startsWith("image")
                        ) {
                          const imageIndex = images()?.findIndex(
                            (image) => entry.name === image.name,
                          );
                          (imageIndex ?? -1) >= 0 && setOpenIndex(imageIndex);
                        } else if (
                          mime.getType(entry.name)?.startsWith("video")
                        ) {
                          window.open(
                            params.path
                              ? `/file_link/${params.path}/${entry.name}`
                              : `/file_link/${entry.name}`,
                          );
                        }
                      }}
                    />
                  </Match>
                  <Match when={layout() === LayoutType.Table}>
                    <FileTable />
                  </Match>
                </Switch>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </>
  );
};

export default Files;
