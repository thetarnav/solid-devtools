import { Icon } from '@/ui'
import { Component, JSX, ParentComponent } from 'solid-js'
import * as styles from './error-overlay.css'
import { HeadlessErrorOverlay, HeadlessErrorOverlayRenderProps } from './HeadlessErrorOverlay'

const RenderErrorOverlay: Component<
  HeadlessErrorOverlayRenderProps & { footer?: JSX.Element }
> = props => (
  <div class={styles.container.fixed}>
    <div class={styles.container.container}>
      <div class={styles.container.overlay} />
      <div class={styles.container.content}>
        <div class={styles.navbar}>
          <div class={styles.pagination}>
            <button class={styles.button} onClick={props.goPrev}>
              <span class="sr-only">Prev</span>
              <Icon.ArrowLeft class={styles.icon} />
            </button>
            <button class={styles.button} onClick={props.goNext}>
              <span class="sr-only">Prev</span>
              <Icon.ArrowRight class={styles.icon} />
            </button>
            <span class={styles.pageCounter}>
              <span>{props.currentCount}</span>
              {' of '}
              <span>{props.maxCount}</span>
            </span>
          </div>
          <div class={styles.controls}>
            <button class={styles.button} onClick={props.resetError}>
              <span class="sr-only">Reset</span>
              <Icon.Refresh class={styles.icon} />
            </button>
          </div>
        </div>
        <div class={styles.content.container}>
          <span class={styles.content.error}>
            <span class={styles.content.errorName}>
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

export const ErrorOverlay: ParentComponent<{
  footer?: JSX.Element
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
