import { defineConfig } from "vite"
import solid from "solid-start"
import { devtoolsPlugin } from "@solid-devtools/transform"

export default defineConfig({
  plugins: [devtoolsPlugin(), solid()],
})
