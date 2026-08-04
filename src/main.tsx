// Node global polyfills - @microsoft/microsoft-graph-client (used for SharePoint
// file uploads) references Node's Buffer/global at runtime, which don't exist in
// the browser. Must run before any other import that might touch the Graph client.
import { Buffer } from "buffer";
if (!window.Buffer) window.Buffer = Buffer;
if (!(window as unknown as { global?: unknown }).global) {
  (window as unknown as { global: unknown }).global = window;
}

import { createRoot } from "react-dom/client";
import "@/styles/custom.css";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
