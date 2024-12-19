/*

A real-world script that will check if solid is on the page,
and notify the content script

*/

import {detectSolid, onSolidDevDetect, onSolidDevtoolsDetect} from '@solid-devtools/shared/detect'
import {log, warn} from '@solid-devtools/shared/utils'
import * as bridge from './bridge.ts'

if (import.meta.env.DEV) log(bridge.Place_Name.Detector_Real_World+' loaded.')

const state: bridge.DetectionState = {
    Solid:    false,
    SolidDev: false,
    Debugger: false,
}

function postState() {
    let data: bridge.DetectEvent = {
        name:  bridge.DETECT_MESSAGE,
        state: state,
    }
    postMessage(data, '*')
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
        postState()
    }
})

onSolidDevDetect(() => {
    if (import.meta.env.DEV) {
        log('Solid_Dev_Mode detected.')
    }
    state.SolidDev = true
    state.Solid    = true
    postState()
})

onSolidDevtoolsDetect(() => {
    if (import.meta.env.DEV) {
        log('Devtools_Client detected.')
    }
    state.Debugger = true
    postState()
})
