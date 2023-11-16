import {makeEventListener} from '@solid-primitives/event-listener'
import * as s from 'solid-js'

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
