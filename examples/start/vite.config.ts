import devtools from 'solid-devtools/vite'
import solid from 'solid-start/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [
        devtools({
            autoname: true,
            locator: {
                targetIDE: 'vscode',
                componentLocation: true,
                jsxLocation: true,
            },
        }),
        solid({}),
    ],
})
