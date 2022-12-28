import devtools from 'solid-devtools/vite'
import solid from 'solid-start/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [devtools({ name: true, componentLocation: true }), solid()],
})
