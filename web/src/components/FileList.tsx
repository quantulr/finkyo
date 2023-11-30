import { useNavigate, useParams } from "react-router-dom";
import { useFileList } from "@/api/files.ts";
import {
  Icon,
  Link, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { EntryItem } from "@/typing/files.ts";
import { FcLeftUp2 } from "react-icons/fc";
import FileListItem from "@/components/FileListItem.tsx";
import { GiEmptyMetalBucket } from "react-icons/gi";
import { getType } from "mime";
import ImageSwiper from "@/components/ImageSwiper.tsx";
import { useMemo, useState } from "react";
import { VideoJS } from "@/components/VideoJs.tsx";

const FileList = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { entry, error, isLoading } = useFileList(params["*"] ?? undefined);
  const [imagePreviewIndex, setImagePreviewIndex] = useState<number>(-1);
  const [showVideo, setShowVideo] = useState(false);
  const images = useMemo(() => {
    if (isLoading || error) {
      return [];
    } else {
      return (
        entry?.data.filter(
          (entry) => getType(entry.name)?.startsWith("image/")
        ) ?? []
      );
    }
  }, [entry?.data, error, isLoading]);

  const [videoSrc, setVideoSrc] = useState<string>();
  if (isLoading)
    return (
      <div className={"flex h-96 items-center justify-center"}>
        <Spinner />
      </div>
    );
  if (error) return <div>error</div>;
  return (
    <>
      <ImageSwiper
        images={images}
        openIndex={imagePreviewIndex}
        onClose={() => {
          setImagePreviewIndex(() => -1);
        }}
      />
      <div className={"w-[300px] h-[200px]"}>
        <VideoJS options={{
          fluid: false,
          controls:true,
          sources: [{
            src: "http://localhost:3000/file_link/OneDrive/图片/漂亮的让我面红的可爱女人.mp4",
            type: "video/mp4"
          }]
        }} onReady={() => {
        }} />
      </div>
      {/*<div className={"w-96 h-64"}>*/}
      {/*  <VideoJS options={{*/}
      {/*    autoplay: true,*/}
      {/*    controls: true,*/}
      {/*    responsive: true,*/}
      {/*    fluid: true,*/}
      {/*    sources: [{*/}
      {/*      src: videoSrc,*/}
      {/*      type: videoSrc ? getType(videoSrc) : undefined*/}
      {/*    }]*/}
      {/*  }} onReady={() => {*/}
      {/*  }} />*/}
      {/*</div>*/}

      {/*<Modal colorScheme={"blackAlpha"} size={"full"} isOpen={showVideo} onClose={() => {*/}
      {/*  setShowVideo(() => false);*/}
      {/*}}>*/}
      {/*  <ModalOverlay />*/}
      {/*  <ModalContent className={"!bg-transparent"}>*/}
      {/*    <ModalCloseButton />*/}
      {/*    <div className={"w-screen h-screen my-auto"}>*/}
      {/*      <VideoJS options={{*/}
      {/*        autoplay: true,*/}
      {/*        controls: true,*/}
      {/*        // responsive: true,*/}
      {/*        // fluid: true,*/}
      {/*        sources: [{*/}
      {/*          src: videoSrc,*/}
      {/*          type: videoSrc ? getType(videoSrc) : undefined*/}
      {/*        }]*/}
      {/*      }} onReady={() => {*/}
      {/*      }} />*/}
      {/*    </div>*/}
      {/*    /!*  <ModalBody>*!/*/}
      {/*    /!*</ModalBody>*!/*/}
      {/*  </ModalContent>*/}
      {/*</Modal>*/}
      {/*<VideoJS options={} onReady={} />*/}
      {entry?.data.length ? (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>NAME</Th>
                <Th className={"w-40"}>SIZE</Th>
                <Th className={"w-40"}>MODIFIED TIME</Th>
              </Tr>
            </Thead>
            <Tbody>
              {params["*"] && (
                <Tr>
                  <Td colSpan={3}>
                    <Link
                      className={"block h-full w-full"}
                      onClick={() => {
                        // 去掉末尾 /
                        let path = params["*"]?.replace(/\/$/, "") ?? "";
                        // 获取上级目录路径
                        path = path.includes("/")
                          ? path.replace(/\/[^/]*$/, "")
                          : "";
                        // 如果路径为空，则跳转根目录
                        path = path ? `/browse/${path}` : "/browse";
                        navigate(path);
                      }}
                    >
                      <Icon as={FcLeftUp2} /> <span>UP</span>
                    </Link>
                  </Td>
                </Tr>
              )}
              {entry?.data?.map((entryItem: EntryItem) => (
                <FileListItem
                  onMediaPreview={() => {
                    const index = images.findIndex(
                      (item) => item.name === entryItem.name
                    );
                    setImagePreviewIndex(() => index);
                  }}
                  onVideoPreview={() => {
                    setVideoSrc(() => params["*"]
                      ? `/file_link/${params["*"]}/${entryItem.name}`
                      : `/file_link/${entryItem.name}`);
                    setShowVideo(() => true);
                  }}
                  entryItem={entryItem}
                  key={entryItem.name}
                />
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      ) : (
        <div className={"flex h-96 flex-col items-center justify-center"}>
          <Icon as={GiEmptyMetalBucket} color={"#b0e1e6"} boxSize={16} />
          <span className={"mt-1 text-gray-500"}>EMPTY</span>
        </div>
      )}
    </>
  );
};

export default FileList;
