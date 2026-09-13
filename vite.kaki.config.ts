import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";
// Keep stable framework code cached separately from frequently edited app screens.
export default mergeConfig(
  base,
  defineConfig({
    build: {
      rolldownOptions: {
        input: { main: "index.html", desktop: "desktop.html" },
        output: {
          codeSplitting: {
            includeDependenciesRecursively: false,
            groups: [
              {
                name: "react",
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: "motion",
                test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
                priority: 20,
              },
              {
                name: "icons",
                test: /node_modules[\\/]@phosphor-icons[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  }),
);
