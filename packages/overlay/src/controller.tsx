import * as s from 'solid-js'
import {useDebugger} from '@solid-devtools/debugger/bundled'
import {createDevtools, type DevtoolsProps} from '@solid-devtools/frontend'

function clone<T>(data: T): T {
    return typeof data === 'object' ? (JSON.parse(JSON.stringify(data)) as T) : data
}
function separate<T>(data: T, callback: (value: T) => void): void {
    queueMicrotask(() => {
        const v = clone(data)
        queueMicrotask(() => callback(v))
    })
}

export function Devtools(props: DevtoolsProps): s.JSX.Element {
    const debug = useDebugger()

    debug.emit('ResetState')

    s.onCleanup(() => debug.emit('InspectNode', null))

    const {bridge, Devtools: Frontend} = createDevtools()

    bridge.output.listen(e => {
        separate(e.details, details => debug.emit(e.name, details as never))
    })

    debug.listen(e => {
        // TODO this should be fixed in the solid-primitives package (allow for passing events straight through)
        separate(e.details, details => bridge.input.emit(e.name, details as never))
    })

    return <Frontend {...props} />
}
