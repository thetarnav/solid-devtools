import {theme} from '@/ui'
import {color} from '@nothing-but/utils'
import {combineProps} from '@solid-primitives/props'
import clsx from 'clsx'
import * as s from 'solid-js'

const thumb_color = (opacity: number): string =>
    color.rgb_to_rgba(color.hex_to_rgb(theme.colors.gray[500]), opacity).toString()

export const custom_scrollbar = 'custom_scrollbar'
export const custom_scrollbar_styles = /*css*/ `
.${custom_scrollbar}::-webkit-scrollbar {
    display: block;
    width: ${theme.spacing[4]};
}
.${custom_scrollbar}::-webkit-scrollbar-button {
    display: none;
}
.${custom_scrollbar}::-webkit-scrollbar-track {
    background-color: transparent;
}
.${custom_scrollbar}::-webkit-scrollbar-track-piece {
    background-color: transparent;
}
.${custom_scrollbar}::-webkit-scrollbar-thumb {
    background-color: transparent;
}
.${custom_scrollbar}::-webkit-scrollbar-corner {
    background-color: transparent;
}
.${custom_scrollbar}:hover::-webkit-scrollbar-thumb {
    background-color: ${thumb_color(0.2)};
}
.${custom_scrollbar}::-webkit-scrollbar-thumb:hover {
    background-color: ${thumb_color(0.4)};
}
`

export const Scrollable: s.ParentComponent<
    s.ComponentProps<'div'> & {contentProps?: s.ComponentProps<'div'>}
> = props => {
    const container_props = combineProps(props, {
        class: clsx(
            custom_scrollbar,
            'relative z-0 w-full h-full overflow-auto overflow-overlay overscroll-none',
        ),
    })

    const [, container_props_without_content] = s.splitProps(container_props, ['contentProps'])

    const content_props = combineProps(() => props.contentProps ?? {}, {
        class: 'relative min-w-full min-h-full w-max h-max overflow-hidden',
        get children() {
            return props.children
        },
    })

    return (
        <div {...container_props_without_content}>
            <div class="absolute inset-0 z-1 pointer-events-none"></div>
            <div {...content_props} />
        </div>
    )
}

// import { ComponentProps, createComputed, createSignal, ParentComponent } from 'solid-js'
// import { createKeyHold } from '@solid-primitives/keyboard'
// import { makeEventListener } from '@solid-primitives/event-listener'
// import { createBodyCursor } from '@solid-primitives/cursor'
// import * as styles from './scrollable.css'
// import { combineProps } from '@solid-primitives/props'

// export const Scrollable: ParentComponent<ComponentProps<'div'>> = props => {
//   const [dragging, setDragging] = createSignal(false)
//   const holdingSpace = createKeyHold(' ')

//   createComputed(() => {
//     // letting go of the spacebar should stop dragging
//     if (!holdingSpace()) setDragging(false)
//   })

//   // TODO: implement this logic in @solid-primitives/keyboard (prevent default repeated events)
//   makeEventListener(window, 'keydown', e => {
//     if (e.key === ' ' && holdingSpace()) e.preventDefault()
//   })

//   createBodyCursor(() => dragging() && 'grabbing')

//   let start = { x: 0, y: 0 }
//   let startScroll = { x: 0, y: 0 }
//   const onPointerDown = (e: PointerEvent) => {
//     if (!holdingSpace()) return
//     e.preventDefault()
//     start = { x: e.x, y: e.y }
//     startScroll = { x: container.scrollLeft, y: container.scrollTop }
//     setDragging(true)
//   }

//   makeEventListener(window, 'pointermove', e => {
//     if (!dragging()) return
//     e.preventDefault()
//     const x = start.x - e.x
//     const y = start.y - e.y
//     container.scrollLeft = startScroll.x + x
//     container.scrollTop = startScroll.y + y
//   })

//   makeEventListener(window, 'pointerup', setDragging.bind(void 0, false))

//   makeEventListener(window, 'mouseout', e => {
//     // if the mouse leaves the window, stop dragging
//     if (!e.relatedTarget) setDragging(false)
//   })

//   let container!: HTMLDivElement
//   const containerProps = combineProps(props, {
//     ref: el => (container = el),
//     get class() {
//       return styles.container[holdingSpace() ? (dragging() ? 'dragging' : 'space') : 'normal']
//     },
//     onPointerDown,
//   })
//   return (
//     <div {...containerProps}>
//       <div class={styles.overlay[holdingSpace() ? 'space' : 'normal']}></div>
//       <div class={styles.content}>{props.children}</div>
//     </div>
//   )
// }
