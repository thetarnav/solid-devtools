import { defineConfig } from "vitest/config"
import solidPlugin from "vite-plugin-solid"
import vitestConfig from "../../configs/vitest.config"

export default defineConfig({
  plugins: [solidPlugin()],
  ...vitestConfig,
})
