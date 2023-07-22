import 'solid-devtools'

async function main() {
    if (!process.env.EXT || process.env.BUILD) {
        await import('@solid-devtools/debugger/bundled')
    }

    import('./main')
}
main()
