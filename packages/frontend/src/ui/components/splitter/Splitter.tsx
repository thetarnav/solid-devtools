import { createBodyCursor } from '@solid-primitives/cursor'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createJSXParser, createToken, resolveTokens } from '@solid-primitives/jsx-parser'
import { createMediaQuery } from '@solid-primitives/media'
import { getPositionInElement } from '@solid-primitives/mouse'
import { scheduleIdle } from '@solid-primitives/scheduled'
import { useRemSize } from '@solid-primitives/styles'
import { clamp } from '@solid-primitives/utils'
import { Index, JSX, batch, createComputed, createMemo, createSignal } from 'solid-js'
import * as styles from './Splitter.css'

export type PanelProps = { children: JSX.Element }

const Parser = createJSXParser<PanelProps>()

function SplitterRoot(props: { children: JSX.Element }) {
    const tokens = resolveTokens(Parser, () => props.children)

    const isMobile = createMediaQuery('(max-width: 640px)')
    const isTouch = createMediaQuery('(hover: none)')

    const [progress, setProgress] = createSignal<number[]>([])
    const [dragging, setDragging] = createSignal<false | number>(false)

    createComputed((p: ReturnType<typeof tokens> = []) => {
        const panels = tokens()
        // stop dragging if the number of panels changes
        if (panels.length !== p.length) {
            batch(() => {
                setProgress(Array.from({ length: panels.length - 1 }, () => 1 / panels.length))
                setDragging(false)
            })
        }
        return panels
    })

    const rem = useRemSize()

    makeEventListener(
        window,
        'pointermove',
        scheduleIdle((e: PointerEvent) => {
            const i = dragging()
            if (i === false) return
            const toEl = getPositionInElement(e.pageX, e.pageY, container)
            const minP = (styles.MIN_SIZE_IN_REM * rem()) / container.clientWidth

            setProgress(prev => {
                let p = clamp(
                    isMobile() ? toEl.y / toEl.height : toEl.x / toEl.width,
                    minP,
                    1 - minP,
                )
                for (let j = 0; j < i; j++) p -= prev[j]!
                if (p < minP) return prev
                const newList = prev.slice()
                if (newList[i + 1]) {
                    newList[i + 1] = newList[i]! + newList[i + 1]! - p
                    if (newList[i + 1]! < minP) return prev
                }
                newList[i] = p
                return newList
            })
        }),
    )
    makeEventListener(window, 'pointerup', setDragging.bind(void 0, false))

    createBodyCursor(() => dragging() !== false && (isMobile() ? 'row-resize' : 'col-resize'))

    const template = createMemo(() => {
        const p = progress()

        let t = ''
        for (let i = 0; i < p.length; i++)
            t += ` minmax(${styles.MIN_SIZE}, ${p[i]! * 100}%) ${styles.SPLIT_SIZE}`
        t += ` minmax(${styles.MIN_SIZE}, 1fr)`

        return t
    })

    let container!: HTMLDivElement
    return (
        <div
            class={styles.container}
            style={{ [isMobile() ? 'grid-template-rows' : 'grid-template-columns']: template() }}
            ref={container}
        >
            <Index each={tokens()}>
                {(panel, i) => (
                    <>
                        <div class={styles.content}>{panel().data.children}</div>
                        {i < tokens().length - 1 && (
                            <div class={styles.split}>
                                <div
                                    class={styles.splitHandle}
                                    data-dragging={dragging()}
                                    onPointerDown={e => {
                                        if (isTouch()) return
                                        e.preventDefault()
                                        setDragging(i)
                                    }}
                                ></div>
                            </div>
                        )}
                    </>
                )}
            </Index>
        </div>
    )
}

const SplitterPanel = createToken(Parser)

export { SplitterPanel as Panel, SplitterRoot as Root }
