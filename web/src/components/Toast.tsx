import { Show, createEffect, onCleanup } from "solid-js";

interface ToastProps {
  message: string | null;
  onDone: () => void;
}

export default function Toast(props: ToastProps) {
  createEffect(
    () => props.message,
    (message) => {
      if (!message) return;
      const timer = setTimeout(() => props.onDone(), 2600);
      onCleanup(() => clearTimeout(timer));
    },
  );

  return (
    <Show when={props.message}>
      {(message) => (
        <div class="toast" role="status" aria-live="polite">
          {message()}
        </div>
      )}
    </Show>
  );
}
