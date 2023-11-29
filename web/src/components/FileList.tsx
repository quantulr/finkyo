import { useNavigate, useParams } from "react-router-dom";
import { useFileList } from "@/api/files.ts";
import {
  Icon,
  Link,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { EntryItem } from "@/typing/files.ts";
import { FcLeftUp2 } from "react-icons/fc";

import FileListItem from "@/components/FileListItem.tsx";
import { GiEmptyMetalBucket } from "react-icons/gi";

import LightGallery from "lightgallery/react";

// import styles
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-thumbnail.css";

// If you want you can use SCSS instead of css
import "lightgallery/scss/lightgallery.scss";
import "lightgallery/scss/lg-zoom.scss";

// import plugins if you need
import lgZoom from "lightgallery/plugins/zoom";
import { getType } from "mime";
import { useCallback, useRef } from "react";
import { InitDetail } from "lightgallery/lg-events";

const FileList = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { entry, error, isLoading } = useFileList(params["*"] ?? undefined);

  const lightGallery = useRef<any>(null);
  const onInit = useCallback((detail: InitDetail) => {
    if (detail) {
      lightGallery.current = detail.instance;
    }
  }, []);
  if (isLoading)
    return (
      <div className={"flex h-96 items-center justify-center"}>
        <Spinner />
      </div>
    );
  if (error) return <div>error</div>;
  return (
    <>
      <LightGallery
        onInit={onInit}
        elementClassNames={"hidden"}
        plugins={[lgZoom]}
      >
        {entry?.data
          .filter((entry) => getType(entry.name)?.startsWith("image/"))
          .map((entry) => (
            <a
              key={entry.name}
              href={
                params["*"]
                  ? `/file_link/${params["*"]}/${entry.name}`
                  : `/file_link/${entry.name}`
              }
            ></a>
          ))}
      </LightGallery>
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
                          ? path.replace(/\/[^\/]*$/, "")
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
                    const index = entry?.data
                      .filter(
                        (item) => getType(item.name)?.startsWith("image/"),
                      )
                      .findIndex((item) => item.name === entryItem.name);
                    lightGallery.current.openGallery(index !== -1 ? index : 0);
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
