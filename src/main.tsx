import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./app";
import { pageForPath } from "./routes";

const container = document.getElementById("root")!;
const initialPage = pageForPath(location.pathname);
// A prerendered build ships real markup, so attach to it rather than throwing it
// away — that is what makes the first paint instant and the page crawlable
// without JavaScript. In dev the container is empty, so render normally.
if (container.hasChildNodes()) hydrateRoot(container, <App initialPage={initialPage} />);
else createRoot(container).render(<App initialPage={initialPage} />);
