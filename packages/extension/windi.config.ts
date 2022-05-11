import { defineConfig } from "windicss/helpers"

export default defineConfig({
	extract: {
		include: ["src/**/*.{html,jsx,tsx}"],
		exclude: ["node_modules/**/*", ".git/**/*", "dist/**/*"],
	},
})
