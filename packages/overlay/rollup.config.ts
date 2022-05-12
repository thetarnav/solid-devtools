import withSolid from "rollup-preset-solid"
import alias from "@rollup/plugin-alias"
import path from "path"

export default withSolid({
	input: "src/index.tsx",
	plugins: [
		alias({
			entries: {
				"@shared": path.resolve(__dirname, "..", "shared"),
				"@ui": path.resolve(__dirname, "..", "ui", "src"),
			},
		}),
	],
})
