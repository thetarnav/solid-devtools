import withSolid from "rollup-preset-solid"
import { vanillaExtractPlugin } from "@vanilla-extract/rollup-plugin"

export default withSolid({
	input: "src/index.tsx",
	plugins: [vanillaExtractPlugin()],
})
