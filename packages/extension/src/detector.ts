/*

A real-world script that will check if solid is on the page,
and notify the content script

*/

import {detectSolid, onSolidDevDetect, onSolidDevtoolsDetect} from '@solid-devtools/shared/detect'
import {log, warn} from '@solid-devtools/shared/utils'

import {
    Place_Name, type DetectionState,
    window_post_message,
} from './shared.ts'


DEV: {log(Place_Name.Detector_Real_World+' loaded.')}


const state: DetectionState = {
    Solid:    false,
    SolidDev: false,
    Debugger: false,
}

detectSolid().then(detected => {
    if (import.meta.env.DEV) {
        if (detected) {
            log('Solid detected.')
        } else {
            warn('Solid NOT detected.')
        }
    }
    if (detected && !state.Solid) {
        state.Solid = true
        window_post_message('Detected', state)
    }
})

onSolidDevDetect(() => {
    if (import.meta.env.DEV) {
        log('Solid_Dev_Mode detected.')
    }
    state.SolidDev = true
    state.Solid    = true
    window_post_message('Detected', state)
})

onSolidDevtoolsDetect(() => {
    if (import.meta.env.DEV) {
        log('Devtools_Client detected.')
    }
    state.Debugger = true
    window_post_message('Detected', state)
})
