import {interceptPropertySet} from './utils.ts'

//
// SolidJS detection
//

export const DATA_HYDRATION_KEY = 'data-hk'
export const SOLID_DEV_GLOBAL   = 'Solid$$'

function script_text_detect_solid(src: string): boolean {
    return src.includes(`$DX_DELEGATE`)
        || src.includes(`getAttribute("data-hk")`)
        || src.includes(`getAttribute('data-hk')`)
        || src.includes(`hasAttribute("data-hk")`)
        || src.includes(`hasAttribute('data-hk')`)
        || src.includes(`Symbol("solid-track")`)
        || src.includes(`Symbol('solid-track')`)
}

/**
Detects if SolidJS is present on the page. In either development or production mode.
*/

export function detectSolid(): Promise<boolean> {
    if (document.readyState === 'complete') {
        return check_for_solid()
    } else {
        return new Promise((resolve) => {
            window.addEventListener('load', () => {
                check_for_solid().then(resolve)
            })
        })
    }
}

// initial version by @aquaductape
export async function check_for_solid(): Promise<boolean> {

    if (detectSolidDev()) return true

    const $hy = (window as any)._$HY as unknown
    if ($hy && typeof $hy === 'object' && 'completed' in $hy && $hy.completed instanceof WeakSet)
        return true

    if (document.querySelector('[data-hk]'))
        return true

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    for (const resource of resources) {
        if (resource.initiatorType === 'script' && resource.name.startsWith(location.origin)) {
            try {
                const response = await fetch(resource.name)
                const text = await response.text()
                if (script_text_detect_solid(text)) {
                    return true
                }
            } catch (_) {/**/}
        }
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
        interceptPropertySet(window,
            SOLID_DEV_GLOBAL,
            value => value && queueMicrotask(callback))
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
    if (detectSolidDevtools()) {
        queueMicrotask(callback)
    } else {
        interceptPropertySet(window as any,
            SOLID_DEVTOOLS_GLOBAL,
            value => value && queueMicrotask(callback))
    }
}
