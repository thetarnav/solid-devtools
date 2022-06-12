import { defineConfig } from "vite"
import solid from "solid-start"
import { devtoolsPlugin } from "@solid-devtools/babel-plugin"

export default defineConfig({
	plugins: [devtoolsPlugin(), solid()],
})
