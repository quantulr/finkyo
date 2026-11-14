import type { JSX } from "@solidjs/web";
import type { Entry } from "./types";
import {
  isArchiveName,
  isAudioName,
  isDirEntry,
  isImageName,
  isTextName,
  isVideoName,
} from "./lib/path";

interface IconProps {
  size?: number;
  class?: string;
}

function StrokeIcon(
  props: IconProps & { children: JSX.Element; viewBox?: string },
) {
  return (
    <svg
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox={props.viewBox ?? "0 0 24 24"}
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </StrokeIcon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 5l7 7-7 7" />
    </StrokeIcon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 9l7 7 7-7" />
    </StrokeIcon>
  );
}

export function IconArrowUp(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </StrokeIcon>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </StrokeIcon>
  );
}

export function IconHome(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-8Z" />
    </StrokeIcon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </StrokeIcon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </StrokeIcon>
  );
}

export function IconList(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.8" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.8" cy="18" r="1" fill="currentColor" stroke="none" />
    </StrokeIcon>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </StrokeIcon>
  );
}

export function IconSort(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 5v14M3 15l4 4 4-4M14 7h7M14 12h5M14 17h3" />
    </StrokeIcon>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </StrokeIcon>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />
    </StrokeIcon>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14 4h6v6M20 4l-8 8" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </StrokeIcon>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
      aria-hidden="true"
    >
      <path d="M8 5.2c0-.9 1-1.4 1.7-.9l9.2 6.1a1.1 1.1 0 0 1 0 1.8l-9.2 6.1c-.7.5-1.7 0-1.7-.9V5.2Z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
      aria-hidden="true"
    >
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
    </svg>
  );
}

export function IconPrevious(props: IconProps) {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
      aria-hidden="true"
    >
      <rect x="4" y="5" width="2.6" height="14" rx="1.3" />
      <path d="M19 6.1v11.8c0 .9-1 1.4-1.7.9l-8.7-5.9a1.1 1.1 0 0 1 0-1.8l8.7-5.9c.7-.5 1.7 0 1.7.9Z" />
    </svg>
  );
}

export function IconNext(props: IconProps) {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="currentColor"
      class={props.class}
      aria-hidden="true"
    >
      <rect x="17.4" y="5" width="2.6" height="14" rx="1.3" />
      <path d="M5 6.1v11.8c0 .9 1 1.4 1.7.9l8.7-5.9a1.1 1.1 0 0 0 0-1.8L6.7 5.2C6 4.7 5 5.2 5 6.1Z" />
    </svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M17 3l4 4-4 4" />
      <path d="M4 11V9a2 2 0 0 1 2-2h15" />
      <path d="M7 21l-4-4 4-4" />
      <path d="M20 13v2a2 2 0 0 1-2 2H3" />
    </StrokeIcon>
  );
}

export function IconVolume(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" stroke="none" />
      <path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10" />
    </StrokeIcon>
  );
}

export function IconVolumeMute(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" stroke="none" />
      <path d="M16 10l5 5M21 10l-5 5" />
    </StrokeIcon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </StrokeIcon>
  );
}

export function IconLink(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </StrokeIcon>
  );
}

export function IconPlaylist(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 7h11M4 12h11M4 17h7" />
      <path d="M18 12.5v6.2a2.3 2.3 0 1 1-2-2.3" />
      <circle cx="18" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </StrokeIcon>
  );
}

export function IconFullscreen(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
    </StrokeIcon>
  );
}

function FileTypeIcon(props: { size?: number; children: JSX.Element }) {
  return (
    <svg
      width={props.size ?? 30}
      height={props.size ?? 30}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <path
        d="M3 10.5A3.5 3.5 0 0 1 6.5 7h5.1c.9 0 1.8.36 2.45 1l1.3 1.3c.4.4.94.62 1.5.62h8.65A3.5 3.5 0 0 1 29 13.42V24a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V10.5Z"
        fill="#4A9DF8"
      />
      <path d="M4 13h24v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V13Z" fill="#76B9FF" />
      <path d="M4 13h24v1.2H4z" fill="#fff" fill-opacity=".34" />
    </FileTypeIcon>
  );
}

export function IconImage(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <rect x="3" y="5" width="26" height="22" rx="5" fill="#BF5AF2" />
      <circle cx="11" cy="12" r="2.4" fill="#fff" fill-opacity=".92" />
      <path
        d="M5.8 24.2l6.5-7.1 4.2 4.6 3.1-3.4 6.1 5.9v.8a2 2 0 0 1-2 2H7.8a2 2 0 0 1-2-2v-.8Z"
        fill="#fff"
        fill-opacity=".88"
      />
    </FileTypeIcon>
  );
}

export function IconVideo(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <rect x="3" y="5" width="26" height="22" rx="5" fill="#FF9F0A" />
      <path
        d="M13.2 11.3c0-1 1.1-1.6 1.9-1l6.2 4.2c.7.5.7 1.5 0 2l-6.2 4.2c-.8.6-1.9 0-1.9-1v-8.4Z"
        fill="#fff"
        fill-opacity=".94"
      />
    </FileTypeIcon>
  );
}

export function IconAudio(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <rect x="3" y="5" width="26" height="22" rx="5" fill="#FF375F" />
      <path
        d="M20.5 10.2c0-.6.5-1.1 1.1-1.1 0 0 .3.1.5.2l.2.1v8.2a2.6 2.6 0 1 1-2.2-2.6v-4l-5.2 1.3v6.1a2.6 2.6 0 1 1-2.2-2.5V12c0-.5.4-.9.8-1l6.5-1.6c.3-.1.5.3.5.8Z"
        fill="#fff"
        fill-opacity=".94"
      />
    </FileTypeIcon>
  );
}

export function IconMusicNote(props: IconProps) {
  return (
    <svg
      width={props.size ?? 64}
      height={props.size ?? 64}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      <path d="M9 18V6.2l10-1.9v11.4" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="15.7" r="2.5" />
    </svg>
  );
}

export function IconText(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <path
        d="M6.5 4h12L26 11.5V26a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 4 26V6.5A2.5 2.5 0 0 1 6.5 4Z"
        fill="#E5E5EA"
      />
      <path d="M18.5 4 26 11.5h-5.5a2 2 0 0 1-2-2V4Z" fill="#B9B9C0" />
      <path
        d="M9 14h11M9 18h8M9 22h5"
        stroke="#8E8E93"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </FileTypeIcon>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <rect x="4" y="7" width="24" height="20" rx="4" fill="#FFD60A" />
      <path
        d="M3 10.5A3.5 3.5 0 0 1 6.5 7h19A3.5 3.5 0 0 1 29 10.5V12H3v-1.5Z"
        fill="#FFE55C"
      />
      <path
        d="M14 7v3.2M18 10.2v3.2M14 13.4v3.2M18 16.6v3.2M14 19.8v3.2h4v-3.2h-4Z"
        stroke="#B08900"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
    </FileTypeIcon>
  );
}

export function IconFile(props: IconProps) {
  return (
    <FileTypeIcon size={props.size}>
      <path
        d="M6.5 4h12L26 11.5V26a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 4 26V6.5A2.5 2.5 0 0 1 6.5 4Z"
        fill="#E5E5EA"
      />
      <path d="M18.5 4 26 11.5h-5.5a2 2 0 0 1-2-2V4Z" fill="#B9B9C0" />
    </FileTypeIcon>
  );
}

export function EntryIcon(props: { entry: Entry; size?: number }) {
  if (isDirEntry(props.entry)) return <IconFolder size={props.size} />;
  if (isImageName(props.entry.name)) return <IconImage size={props.size} />;
  if (isVideoName(props.entry.name)) return <IconVideo size={props.size} />;
  if (isAudioName(props.entry.name)) return <IconAudio size={props.size} />;
  if (isTextName(props.entry.name)) return <IconText size={props.size} />;
  if (isArchiveName(props.entry.name)) return <IconArchive size={props.size} />;
  return <IconFile size={props.size} />;
}
