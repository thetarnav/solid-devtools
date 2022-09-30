import { defineConfig } from "vitest/config"
import config from "../../configs/vitest.config"

export default defineConfig({
  resolve: { conditions: ["browser", "development"] },
  ...config,
})
