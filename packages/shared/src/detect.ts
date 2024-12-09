import 'solid-js'
import {interceptPropertySet} from './utils.ts'

//
// SolidJS detection
//

export const DATA_HYDRATION_KEY = 'data-hk'
export const SOLID_DEV_GLOBAL = 'Solid$$'

/**
 * Detects if SolidJS is present on the page. In either development or production mode.
 */
// code by @aquaductape
export async function detectSolid(): Promise<boolean> {
    if (detectSolidDev()) return true

    const $hy = (window as any)._$HY as unknown
    if ($hy && typeof $hy === 'object' && 'completed' in $hy && $hy.completed instanceof WeakSet)
        return true

    if (document.querySelector('[' + DATA_HYDRATION_KEY + ']'))
        return true

    const scripts = document.querySelectorAll('script')
    const attributeHydrateKeyNameRegex = new RegExp(
        `(?:has|get)Attribute\\(["']${DATA_HYDRATION_KEY}["']\\)`,
    )

    for (const script of scripts) {
        if (script.textContent?.match(attributeHydrateKeyNameRegex)) return true
        if (
            script.type !== 'module' ||
            script.crossOrigin !== 'anonymous' ||
            script.src.match(/^chrome-extension/)
        )
            continue

        const result = await fetch(script.src)
        const text = await result.text()
        if (text.match(/\$DX_DELEGATE/) || text.match(attributeHydrateKeyNameRegex)) return true
    }

    return false
}

export function detectSolidDev(): boolean {
    return !!window[SOLID_DEV_GLOBAL]
}

export function onSolidDevDetect(callback: () => void): void {
    if (detectSolidDev()) {
        queueMicrotask(callback)
    } else {
        interceptPropertySet(window, SOLID_DEV_GLOBAL, value => {
            value && queueMicrotask(callback)
        })
    }
}

//
// Solid DevTools Settler detection
//

export const SOLID_DEVTOOLS_GLOBAL = 'SolidDevtools$$'

export function detectSolidDevtools(): boolean {
    return !!(window as any)[SOLID_DEVTOOLS_GLOBAL]
}

export function onSolidDevtoolsDetect(callback: () => void): void {
    if (detectSolidDevtools()) queueMicrotask(callback)
    else
        interceptPropertySet(
            window as any,
            SOLID_DEVTOOLS_GLOBAL,
            value => value && queueMicrotask(callback),
        )
}
