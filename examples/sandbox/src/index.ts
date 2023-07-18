import 'solid-devtools'

async function main() {
    if (!process.env.EXT || process.env.BUILD) {
        const { attachDevtoolsOverlay } = await import('@solid-devtools/overlay')

        attachDevtoolsOverlay({
            defaultOpen: true,
            noPadding: true,
        })
    }

    import('./main')
}
main()
