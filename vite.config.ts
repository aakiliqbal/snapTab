import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const removeCrossorigin: Plugin = {
  name: 'remove-crossorigin',
  apply: 'build',
  transformIndexHtml(html: string) {
    return html.replace(/ crossorigin/g, '');
  }
};

export default defineConfig({
  plugins: [react(), removeCrossorigin],
  build: {
    rollupOptions: {
      input: {
        newtab: "newtab.html",
        popup: "popup.html"
      }
    }
  }
});
