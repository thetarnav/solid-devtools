import { createBodyCursor } from '@solid-primitives/cursor'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createToken, resolveTokens } from '@solid-primitives/jsx-tokenizer'
import { createMediaQuery } from '@solid-primitives/media'
import { getPositionInElement } from '@solid-primitives/mouse'
import { scheduleIdle } from '@solid-primitives/scheduled'
import { useRemSize } from '@solid-primitives/styles'
import { clamp } from '@solid-primitives/utils'
import clsx from 'clsx'
import { Index, JSX, batch, createComputed, createMemo, createSignal } from 'solid-js'

export type PanelProps = { children: JSX.Element }

const SplitterPanel = createToken<PanelProps>()

const MIN_SIZE_IN_REM = 8
const MIN_SIZE = `${MIN_SIZE_IN_REM}rem`
const SPLIT_SIZE = '1px'

function SplitterRoot(props: { children: JSX.Element }) {
    const tokens = resolveTokens(SplitterPanel, () => props.children)

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
            const minP = (MIN_SIZE_IN_REM * rem()) / container.clientWidth

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
    makeEventListener(window, 'pointerup', () => setDragging(false))

    createBodyCursor(() => dragging() !== false && (isMobile() ? 'row-resize' : 'col-resize'))

    const template = createMemo(() => {
        const p = progress()

        let t = ''
        for (let i = 0; i < p.length; i++)
            t += ` minmax(${MIN_SIZE}, ${p[i]! * 100}%) ${SPLIT_SIZE}`
        t += ` minmax(${MIN_SIZE}, 1fr)`

        return t
    })

    let container!: HTMLDivElement
    return (
        <div
            class="grid grid-auto-flow-col h-full w-full"
            style={{ [isMobile() ? 'grid-template-rows' : 'grid-template-columns']: template() }}
            ref={container}
        >
            <Index each={tokens()}>
                {(panel, i) => (
                    <>
                        <div class="relative z-1 overflow-hidden">{panel().data.children}</div>
                        {i < tokens().length - 1 && (
                            <div class="relative bg-panel-border">
                                <div
                                    class={clsx(
                                        'absolute z-9999 select-none',
                                        'cursor-row-resize sm:cursor-col-resize',
                                        '-inset-y-3px inset-x-0 sm:inset-y-0 sm:-inset-x-3px',
                                        'bg-panel-border transition',
                                        dragging() === false && 'opacity-0',
                                    )}
                                    onPointerDown={e => {
                                        if (isTouch()) return
                                        e.preventDefault()
                                        setDragging(i)
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </Index>
        </div>
    )
}

export { SplitterPanel as Panel, SplitterRoot as Root }
