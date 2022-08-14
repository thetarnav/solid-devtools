import defineConfig from "../../configs/tsup.config"
import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin"

export default defineConfig(
  "tsx",
  undefined,
  ["theme/index.ts", "animation/index.ts"],
  [vanillaExtractPlugin()],
)
