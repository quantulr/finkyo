/* @refresh reload */
import { render } from "solid-js/web";
// import * as dayjs from "dayjs";
// import duration from "dayjs/plugin/duration";

import "@/index.css";
import App from "@/App";
import { attachDevtoolsOverlay } from "@solid-devtools/overlay";
import "overlayscrollbars/overlayscrollbars.css";

attachDevtoolsOverlay();
// dayjs.extend(duration);
const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}

render(() => <App />, root!);
