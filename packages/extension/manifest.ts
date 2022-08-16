import { defineManifest } from "@crxjs/vite-plugin"
import { version } from "./package.json"

export default defineManifest({
  manifest_version: 3,
  name: "Solid Devtools",
  description:
    "Chrome Developer Tools extension for debugging SolidJS applications. It allows for visualizing and interacting with Solid's reactivity graph, as well as inspecting component state and hierarchy.",
  version,
  author: "Damian Tarnawski",
  minimum_chrome_version: "94",
  devtools_page: "devtools/devtools.html",
  content_scripts: [
    {
      matches: ["*://*/*"],
      js: ["content/content.ts"],
      run_at: "document_start",
    },
  ],
  background: {
    service_worker: "background/background.ts",
    type: "module",
  },
  permissions: [],
  action: {
    default_icon: {
      "16": "assets/icons/solid-gray-16.png",
      "32": "assets/icons/solid-gray-32.png",
      "48": "assets/icons/solid-gray-48.png",
      "128": "assets/icons/solid-gray-128.png",
    },
    default_title: "Solid Devtools",
  },
  icons: {
    "16": "assets/icons/solid-normal-16.png",
    "32": "assets/icons/solid-normal-32.png",
    "48": "assets/icons/solid-normal-48.png",
    "128": "assets/icons/solid-normal-128.png",
  },
})
