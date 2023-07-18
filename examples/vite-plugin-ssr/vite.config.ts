import devtools from 'solid-devtools/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import ssr from 'vite-plugin-ssr/plugin'

export default defineConfig({
    plugins: [
        devtools({
            autoname: true,
        }),
        solid({ ssr: true }),
        ssr(),
    ],
})
