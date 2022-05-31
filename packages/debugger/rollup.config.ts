import withSolid from "rollup-preset-solid"
import alias from "@rollup/plugin-alias"
import path from "path"

export default withSolid({
	input: "src/index.ts",
	plugins: [
		alias({
			entries: {
				"@shared": path.resolve(__dirname, "..", "shared"),
				"@solid-devtools/locator": path.resolve(__dirname, "..", "locator", "src"),
			},
		}),
	],
})
