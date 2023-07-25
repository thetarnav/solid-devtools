import { JSX } from 'solid-js'

export function Badge(props: { children: JSX.Element }): JSX.Element {
    return (
        <div class="inline-block px-1 bg-cyan-600 bg-opacity-20 rounded text-cyan-600 uppercase font-700 text-2.5 select-none">
            {props.children}
        </div>
    )
}
