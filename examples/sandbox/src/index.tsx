import 'solid-devtools'

async function main() {
    if (!import.meta.env.EXT || !import.meta.env.DEV) {
        await import('@solid-devtools/debugger/bundled')
    }

    import('./main.tsx')
}
main()
