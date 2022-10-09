import {
  batch,
  ComponentProps,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  JSX,
  mergeProps,
  onCleanup,
  onError,
  Show,
  untrack,
  ParentComponent,
} from 'solid-js'

export type HeadlessErrorOverlayRenderProps = {
  error: unknown
  goPrev: () => void
  goNext: () => void
  resetError: () => void
  currentCount: number
  maxCount: number
}

function ErrorOverlayInternal(props: {
  render: JSX.Element | ((props: HeadlessErrorOverlayRenderProps) => JSX.Element)
  errors: unknown[]
  resetError: () => void
}): JSX.Element {
  const [currentPage, setCurrentPage] = createSignal(1)

  const length = createMemo(() => props.errors.length)
  const currentError = createMemo(() => props.errors[currentPage() - 1])

  createComputed((currentLength: number) => {
    const newLength = length()
    if (currentLength < newLength) {
      setCurrentPage(current => current + 1)
    }
    return newLength
  }, length())

  function goPrev() {
    setCurrentPage(c => {
      if (c > 1) {
        return c - 1
      }
      return length()
    })
  }
  function goNext() {
    setCurrentPage(c => {
      if (c < length()) {
        return c + 1
      }
      return 1
    })
  }

  const { render } = props

  if (typeof render === 'function') {
    return untrack(() =>
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

export const HeadlessErrorOverlay: ParentComponent<{
  render?: JSX.Element | ((props: HeadlessErrorOverlayRenderProps) => JSX.Element)
  onError?: (error: unknown) => void
}> = props => {
  const [errors, setErrors] = createSignal<unknown[]>([])
  const [fallback, setFallback] = createSignal(false)

  function resetError() {
    setErrors([])
    setFallback(false)
  }

  function pushError(error: unknown) {
    props.onError?.(error)
    setErrors(current => [error, ...current])
  }

  createEffect(() => {
    const onErrorEvent = (error: ErrorEvent) => {
      pushError(error.error)
    }

    window.addEventListener('error', onErrorEvent)

    onCleanup(() => {
      window.removeEventListener('error', onErrorEvent)
    })
  })

  onError(error => {
    pushError(error)
  })

  const errorOverlayInternalProps: ComponentProps<typeof ErrorOverlayInternal> = {
    get errors() {
      return errors()
    },
    get render() {
      return props.render
    },
    resetError,
  }

  return [
    ErrorBoundary({
      fallback(err, reset) {
        batch(() => {
          setFallback(true)
          pushError(err)
        })

        return untrack(() =>
          ErrorOverlayInternal(
            mergeProps(errorOverlayInternalProps, {
              resetError() {
                batch(() => {
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
    Show({
      get when() {
        return !fallback() && errors().length
      },
      get children() {
        return untrack(() => ErrorOverlayInternal(errorOverlayInternalProps))
      },
    }),
  ]
}
