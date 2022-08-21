import defineConfig from "../../configs/tsup.config"
import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin"

export default defineConfig({
  extension: "tsx",
  additionalEntries: ["theme/index.ts", "animation/index.ts", "icons/index.tsx"],
  additionalPlugins: [vanillaExtractPlugin()],
})
