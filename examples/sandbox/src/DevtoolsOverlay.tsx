import {attachDevtoolsOverlay} from '@solid-devtools/overlay'

declare global {
    interface Window {
        $$dispose_devtools_overlay: VoidFunction | undefined
    }
}

export default function DevtoolsOverlay(
    props: Parameters<typeof attachDevtoolsOverlay>[0],
): undefined {
    if (window.$$dispose_devtools_overlay) {
        console.log('Reloading devtools overlay...')

        window.$$dispose_devtools_overlay()
        window.$$dispose_devtools_overlay = undefined
    }

    window.$$dispose_devtools_overlay = attachDevtoolsOverlay(props)
    return
}
