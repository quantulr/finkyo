import { Icon, Link, Td, Tr } from "@chakra-ui/react";
import { EntryItem, EntryType } from "@/typing/files.ts";
import { filesize } from "filesize";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FcFolder } from "react-icons/fc";
import { entryIconFromFile } from "@/lib/fs.tsx";
import { getType } from "mime";
import dayjs from "dayjs";

const FileListItem = ({
  entryItem,
  onMediaPreview,
}: {
  entryItem: EntryItem;
  onMediaPreview: () => void;
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const routeLocation = useLocation();
  return (
    <Tr key={entryItem.name}>
      <Td>
        <Link
          className={"flex h-5 items-center"}
          onClick={() => {
            if (entryItem.entryType === EntryType.Directory) {
              navigate(`${routeLocation.pathname}/${entryItem.name}`);
            } else if (entryItem.entryType === EntryType.File) {
              console.log(params["*"]);
              if (getType(entryItem.name)?.startsWith("image/")) {
                onMediaPreview();
              } else {
                location.href = params["*"]
                  ? `/file_link/${params["*"]}/${entryItem.name}`
                  : `/file_link/${entryItem.name}`;
              }
            }
          }}
        >
          <Icon
            as={
              entryItem.entryType === EntryType.Directory
                ? FcFolder
                : entryItem.entryType === EntryType.File
                  ? entryIconFromFile(entryItem.name)
                  : undefined
            }
          />
          <span className={"ml-1"}>{entryItem.name}</span>
        </Link>
      </Td>
      <Td>{entryItem.size ? filesize(entryItem.size) : undefined}</Td>
      <Td>
        {entryItem.modified &&
          dayjs(entryItem.modified).format("YYYY-MM-DD HH:mm:ss")}
      </Td>
    </Tr>
  );
};

export default FileListItem;
