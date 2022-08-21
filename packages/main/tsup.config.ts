import defineConfig from "../../configs/tsup.config"

export default defineConfig({ extension: "ts", server: true, additionalEntries: ["vite"] })
