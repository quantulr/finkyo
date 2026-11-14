import type { JSX } from "@solidjs/web";

interface IconButtonProps {
  label: string;
  children: JSX.Element;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  class?: string;
}

export default function IconButton(props: IconButtonProps) {
  return (
    <button
      type="button"
      class={["icon-button", props.class, { active: props.active }]}
      aria-label={props.label}
      aria-pressed={
        props.active === undefined ? undefined : props.active ? "true" : "false"
      }
      title={props.label}
      disabled={props.disabled}
      onClick={(event) => props.onClick?.(event)}
    >
      {props.children}
    </button>
  );
}
