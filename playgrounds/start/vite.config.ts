import { defineConfig } from "vite"
import solid from "solid-start/vite"
import devtools from "solid-devtools/vite"

export default defineConfig({
  plugins: [devtools({ name: true }), solid()],
})
