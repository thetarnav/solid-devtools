import * as s from 'solid-js'
import {makeEventListener} from '@solid-primitives/event-listener'
import {icon} from './index.ts'

export type HeadlessErrorOverlayRenderProps = {
    error: unknown
    goPrev: () => void
    goNext: () => void
    resetError: () => void
    currentCount: number
    maxCount: number
}

function ErrorOverlayInternal(props: {
    render: s.JSX.Element | ((props: HeadlessErrorOverlayRenderProps) => s.JSX.Element)
    errors: unknown[]
    resetError: () => void
}): s.JSX.Element {
    const [currentPage, setCurrentPage] = s.createSignal(1)

    const length = s.createMemo(() => props.errors.length)
    const currentError = s.createMemo(() => props.errors[currentPage() - 1])

    s.createComputed((currentLength: number) => {
        const newLength = length()
        if (currentLength < newLength) {
            setCurrentPage(current => current + 1)
        }
        return newLength
    }, length())

    function goPrev(): void {
        setCurrentPage(c => {
            if (c > 1) {
                return c - 1
            }
            return length()
        })
    }
    function goNext(): void {
        setCurrentPage(c => {
            if (c < length()) {
                return c + 1
            }
            return 1
        })
    }

    const {render} = props

    if (typeof render === 'function') {
        return s.untrack(() =>
            render({
                goPrev,
                goNext,
                resetError: props.resetError,
                get currentCount() {
                    return currentPage()
                },
                get maxCount() {
                    return length()
                },
                get error() {
                    return currentError()
                },
            }),
        )
    }

    return render
}

export const HeadlessErrorOverlay: s.ParentComponent<{
    render?: s.JSX.Element | ((props: HeadlessErrorOverlayRenderProps) => s.JSX.Element)
    onError?: (error: unknown) => void
    catchWindowErrors?: boolean
}> = props => {
    const [errors, setErrors] = s.createSignal<unknown[]>([])
    const [fallback, setFallback] = s.createSignal(false)

    function resetError(): void {
        setErrors([])
        setFallback(false)
    }

    function pushError(error: unknown): void {
        props.onError?.(error)
        setErrors(current => [error, ...current])
    }

    props.catchWindowErrors && makeEventListener(window, 'error', pushError)
    s.onError(pushError)

    const errorOverlayInternalProps: s.ComponentProps<typeof ErrorOverlayInternal> = {
        get errors() {
            return errors()
        },
        get render() {
            return props.render
        },
        resetError,
    }

    return [
        s.ErrorBoundary({
            fallback(err, reset) {
                s.batch(() => {
                    setFallback(true)
                    pushError(err)
                })

                return s.untrack(() =>
                    ErrorOverlayInternal(
                        s.mergeProps(errorOverlayInternalProps, {
                            resetError() {
                                s.batch(() => {
                                    resetError()
                                    reset()
                                })
                            },
                        }),
                    ),
                )
            },
            get children() {
                return props.children
            },
        }),
        s.Show({
            get when() {
                return !fallback() && errors().length
            },
            get children() {
                return s.untrack(() => ErrorOverlayInternal(errorOverlayInternalProps))
            },
        }),
    ]
}

const button =
    'w-8 h-8 center-child rounded-md bg-panel-8 hover:bg-panel-7 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-panel-7 active:bg-panel-6 active:ring-offset-0 active:ring-0'

const icon_class = 'w-4 h-4 text-current'

const RenderErrorOverlay: s.Component<HeadlessErrorOverlayRenderProps & {
    footer?: s.JSX.Element,
}> = props => (
    <div class="fixed inset-0 z-9999 overflow-y-auto overscroll-none">
        <div class="min-h-full p-y-4 p-x-8 center-child bg-black/50">
            <div class="min-w-80 p-4 gap-y-2 m-y-8 overflow-hidden bg-panel-8 rounded-md font-mono text-panel-1">
                <div class="flex items-center justify-between">
                    <div class="center-child gap-x-1">
                        <button class={button} onClick={props.goPrev}>
                            <span class="sr-only">Prev</span>
                            <icon.ArrowLeft class={icon_class} />
                        </button>
                        <button class={button} onClick={props.goNext}>
                            <span class="sr-only">Prev</span>
                            <icon.ArrowRight class={icon_class} />
                        </button>
                        <span class="p-1 font-500">
                            <span>{props.currentCount}</span>
                            {' of '}
                            <span>{props.maxCount}</span>
                        </span>
                    </div>
                    <div class="center-child gap-x-1">
                        <button class={button} onClick={props.resetError}>
                            <span class="sr-only">Reset</span>
                            <icon.Refresh class={icon_class} />
                        </button>
                    </div>
                </div>
                <div class="p-t-2 flex flex-col gap-y-2">
                    <span class="text-red font-500 break-words">
                        <span class="font-700">
                            {props.error instanceof Error ? props.error.name : 'UnknownError'}
                        </span>
                        {': '}
                        {props.error instanceof Error ? props.error.message : String(props.error)}
                    </span>
                    {props.footer && <div>{props.footer}</div>}
                </div>
            </div>
        </div>
    </div>
)

export const ErrorOverlay: s.ParentComponent<{
    footer?: s.JSX.Element
    catchWindowErrors?: boolean
}> = props => {
    return (
        <HeadlessErrorOverlay
            // eslint-disable-next-line no-console
            onError={e => console.error(e)}
            render={overlayProps => <RenderErrorOverlay {...overlayProps} footer={props.footer} />}
            catchWindowErrors={props.catchWindowErrors}
        >
            {props.children}
        </HeadlessErrorOverlay>
    )
}
