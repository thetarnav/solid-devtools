import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    clearMocks: true,
    environment: "jsdom",
    transformMode: {
      web: [/\.[jt]sx?$/],
    },
  },
})
