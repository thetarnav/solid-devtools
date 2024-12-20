/*

A real-world script.
Debugger Client injected into the inspected page

*/

import {useDebugger} from '@solid-devtools/debugger'
import {log, warn} from '@solid-devtools/shared/utils'

import {
    Place_Name,
    window_post_message, window_on_message, window_post_message_obj,
} from './shared.ts'


DEV: {log(Place_Name.Debugger_Real_World+' loaded.')}


class Version {
    major: number = 0
    minor: number = 0
    patch: number = 0
}

function version_from_string(str: string): [Version, boolean] {

    let v = new Version

    let parts = str.split('.')

    v.major = Number(parts[0])
    v.minor = Number(parts[1])
    v.patch = Number(parts[2])

    let ok = !isNaN(v.major) && v.major >= 0 &&
             !isNaN(v.minor) && v.minor >= 0 &&
             !isNaN(v.patch) && v.patch >= 0

    return [v, ok]
}

function match_version_patch(actual: Version, expected: Version): boolean {
    return actual.major === expected.major &&
           actual.minor === expected.minor &&
           actual.patch  >= expected.patch
}

function warn_on_version_mismatch(
    actual_str:   string | null,
    expected_str: string | null,
    title:        string,
) {
    if (!actual_str) {
        return warn(`No actual ${title} version found!`)
    }
    if (!expected_str) {
        return warn(`No expected ${title} version found!`)
    }

    // warn if the matching adapter version is not the same minor version range as the actual adapter
    let [actual,   actual_ok]   = version_from_string(actual_str)
    let [expected, expected_ok] = version_from_string(expected_str)

    if (!actual_ok) {
        warn(`Actual version ${title}@${actual_str} cannot be parsed.`)
    }
    if (!expected_ok) {
        warn(`Expected version ${title}@${expected_str} cannot be parsed.`)
    }
    if (!match_version_patch(actual, expected)) {
        warn(`VERSION MISMATCH!
Current version:  ${title}@${actual_str}
Expected version: ${title}@${expected_str}`)
    }
}

const debug = useDebugger()

/* Check versions */
warn_on_version_mismatch(debug.meta.versions.get_client(), import.meta.env.EXPECTED_CLIENT, 'solid-devtools')
warn_on_version_mismatch(debug.meta.versions.get_solid(), debug.meta.versions.get_expected_solid(), 'solid-js')

// in case of navigation/page reload, reset the locator mode state in the extension
window_post_message('ResetPanel', undefined)
window_post_message('Debugger_Connected', {
    client: debug.meta.versions.get_client(),
    solid:  debug.meta.versions.get_solid(),
})

/* From Content */
window_on_message(e => {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (e.name) {
    case 'DevtoolsOpened':
        debug.toggleEnabled(e.details)
        break
    default:
        /* Content -> Debugger */
        debug.emit(e.name as any, e.details)
    }
})

/* Debugger -> Content */
debug.listen(window_post_message_obj)
