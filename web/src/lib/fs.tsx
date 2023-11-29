import { FcFile, FcPicture, FcVideoFile } from "react-icons/fc";
import { getType } from "mime";
import { IconType } from "react-icons";
import { LuFileJson } from "react-icons/lu";

export const entryIconFromFile = (fileName: string): IconType => {
  const mime = getType(fileName);
  if (mime?.startsWith("image/")) {
    return FcPicture;
  } else if (mime?.startsWith("video/")) {
    return FcVideoFile;
  } else if (mime === "application/json") {
    return LuFileJson;
  } else {
    return FcFile;
  }
};
