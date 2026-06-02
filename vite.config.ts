import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const removeCrossorigin: Plugin = {
  name: 'remove-crossorigin',
  apply: 'build',
  transformIndexHtml(html: string) {
    return html.replace(/ crossorigin/g, '');
  }
};

const copyNewtabToIndex: Plugin = {
  name: "copy-newtab-to-index",
  apply: "build",
  writeBundle(options) {
    const outputDirectory = typeof options.dir === "string" ? options.dir : "dist";
    const newtabPath = join(outputDirectory, "newtab.html");
    if (existsSync(newtabPath)) {
      copyFileSync(newtabPath, join(outputDirectory, "index.html"));
    }
  }
};

export default defineConfig({
  plugins: [react(), removeCrossorigin, copyNewtabToIndex],
  build: {
    rollupOptions: {
      input: {
        newtab: "newtab.html",
        popup: "popup.html"
      }
    }
  }
});
