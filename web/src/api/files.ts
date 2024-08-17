import request from "@/lib/request.ts";
import { EntryItem } from "@/typing/files";
import useSWR from "swr";

export const useFileList = (path?: string) => {
  const fetcher = (key: string) =>
    request.get<never, BaseResponse<EntryItem[]>>(key);
  const { data, error, isLoading } = useSWR(`/files/${path ?? ""}`, fetcher);
  return {
    entry: data,
    isLoading,
    error,
  };
};
