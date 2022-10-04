import { ParentComponent } from "solid-js"
import { ErrorOverlay as HeadlessErrorOverlay, ErrorOverlayComponents } from "solid-error-overlay"
import * as styles from "./error-overlay.css"
import { Icon } from "@/ui"

const CustomErrorOverlayComponents: Partial<ErrorOverlayComponents> = {
  ErrorOverlayContainer: props => (
    <div class={styles.container.fixed}>
      <div class={styles.container.container}>
        <div class={styles.container.overlay} />
        <div class={styles.container.content}>{props.children}</div>
      </div>
    </div>
  ),
  ErrorOverlayNavbar: props => <div class={styles.navbar}>{props.children}</div>,
  ErrorOverlayPagination: props => <div class={styles.pagination}>{props.children}</div>,
  ErrorOverlayPrevButton: props => (
    <button class={styles.button} onClick={props.onClick}>
      <span class="sr-only">Prev</span>
      <Icon.ArrowLeft class={styles.icon} />
    </button>
  ),
  ErrorOverlayNextButton: props => (
    <button class={styles.button} onClick={props.onClick}>
      <span class="sr-only">Prev</span>
      <Icon.ArrowRight class={styles.icon} />
    </button>
  ),
  ErrorOverlayPageCounter: props => (
    <span class={styles.pageCounter}>
      <span>{props.currentCount}</span>
      {" of "}
      <span>{props.maxCount}</span>
    </span>
  ),
  ErrorOverlayControls: props => <div class={styles.controls}>{props.children}</div>,
  ErrorOverlayResetButton: props => (
    <button class={styles.button} onClick={props.onClick}>
      <span class="sr-only">Reset</span>
      <Icon.Refresh class={styles.icon} />
    </button>
  ),
  ErrorOverlayContent: props => (
    <div class={styles.content.container}>
      {props.children}
      <ul class={styles.content.versions}>
        <li class={styles.content.version}>Extension: {window.versions.extension}</li>
        <li class={styles.content.version}>Client: {window.versions.client}</li>
        <li class={styles.content.version}>Expected client: {window.versions.expectedClient}</li>
      </ul>
    </div>
  ),
  ErrorOverlayErrorInfo: props => (
    <span class={styles.content.error}>
      <span class={styles.content.errorName}>
        {props.value instanceof Error ? props.value.name : "UnknownError"}
      </span>
      {": "}
      {props.value instanceof Error ? props.value.message : String(props.value)}
    </span>
  ),
}

export const ErrorOverlay: ParentComponent = props => {
  return (
    <HeadlessErrorOverlay
      {...(CustomErrorOverlayComponents as ErrorOverlayComponents)}
      onError={e => console.error(e)}
    >
      {props.children}
    </HeadlessErrorOverlay>
  )
}
