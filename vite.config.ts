import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const machinaLayoutRoot = resolve(__dirname, "../MachinaLayout.JS");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "machinalayout/match",
        replacement: resolve(machinaLayoutRoot, "src/match/index.ts"),
      },
      {
        find: "machinalayout/react",
        replacement: resolve(machinaLayoutRoot, "src/react/index.ts"),
      },
      {
        find: "machinalayout/machina",
        replacement: resolve(machinaLayoutRoot, "src/machina/index.ts"),
      },
      {
        find: "machinalayout",
        replacement: resolve(machinaLayoutRoot, "src/index.ts"),
      },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  test: {
    environment: "jsdom",
    deps: {
      moduleDirectories: [resolve(machinaLayoutRoot, "node_modules")],
    },
  },
});
