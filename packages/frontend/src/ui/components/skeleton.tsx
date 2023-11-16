import {createPolled} from '@solid-primitives/timer'
import {Component} from 'solid-js'

export const Skeleton: Component = () => {
    const nDots = createPolled((p: number = 0) => (p === 3 ? 1 : ++p), 800)

    return (
        <div class="center-child w-full h-full bg-gray-200 text-gray-600">
            Loading{Array.from({length: nDots()}, () => '.')}
        </div>
    )
}
