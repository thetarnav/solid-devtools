import { Component, createEffect, createMemo, For, Show } from "solid-js"
import { GraphSignal } from "@solid-devtools/shared/graph"
import { useHighlights, useSignalContext } from "../ctx/highlights"
import { createHover } from "@solid-aria/interactions"
import {
  EncodedPreview,
  EncodedPreviewPayloadMap,
  ValueType,
} from "@solid-devtools/shared/serialize"
import { theme } from "../theme"
import { HighlightText } from "../highlight/Highlight"
import * as styles from "./SignalNode.css"

type ValueComponent<K extends ValueType> = Component<
  K extends keyof EncodedPreviewPayloadMap ? { value: EncodedPreviewPayloadMap[K] } : {}
>

const StringValuePreview: ValueComponent<ValueType.String> = props => {
  return <span class={styles.ValueString}>"{props.value}"</span>
}

const NumberValuePreview: ValueComponent<ValueType.Number> = props => {
  return <span class={styles.ValueNumber}>{props.value}</span>
}

const BooleanValuePreview: ValueComponent<ValueType.Boolean> = props => {
  return (
    <input
      type="checkbox"
      class={styles.ValueBoolean}
      onClick={e => e.preventDefault()}
      checked={props.value}
    ></input>
  )
}

const ObjectValuePreview: ValueComponent<ValueType.Object> = props => {
  return <span class={styles.ValueObject}>…</span>
}

const ArrayValuePreview: ValueComponent<ValueType.Array> = props => {
  return (
    <Show when={props.value > 0} fallback={<span class={styles.EmptyArray}>Empty Array</span>}>
      <span>Array [{props.value}]</span>
    </Show>
  )
}

const FunctionValuePreview: ValueComponent<ValueType.Function> = props => {
  return (
    <span class={styles.ValueFunction}>{props.value ? `f ${props.value}()` : "function()"}</span>
  )
}

const ValuePreview: Component<{
  updated?: boolean
  highlighted?: boolean
  value: EncodedPreview
}> = props => {
  const Value = createMemo(() => {
    switch (props.value.type) {
      case ValueType.String:
        return <StringValuePreview {...props.value} />
      case ValueType.Number:
        return <NumberValuePreview {...props.value} />
      case ValueType.Boolean:
        return <BooleanValuePreview {...props.value} />
      case ValueType.Object:
        return <ObjectValuePreview />
      case ValueType.Array:
        return <ArrayValuePreview {...props.value} />
      case ValueType.Function:
        return <FunctionValuePreview {...props.value} />
      default:
        return <span>{ValueType[props.value.type]}</span>
    }
  })

  return (
    <HighlightText
      strong={props.updated}
      light={props.highlighted}
      bgColor={theme.color.amber[400]}
      textColor
      class={styles.ValuePreview}
    >
      <Value />
    </HighlightText>
  )
}

export const Signals: Component<{ each: GraphSignal[] }> = props => {
  return (
    <Show when={props.each.length}>
      <div class={styles.Signals.container}>
        <For each={props.each}>{signal => <SignalNode signal={signal} />}</For>
      </div>
    </Show>
  )
}

export const SignalNode: Component<{ signal: GraphSignal }> = ({ signal }) => {
  const { useUpdatedSelector } = useSignalContext()

  const isUpdated = useUpdatedSelector(signal.id)

  const { highlightSignalObservers, isSourceHighlighted } = useHighlights()
  const isHighlighted = isSourceHighlighted.bind(null, signal)

  const { hoverProps, isHovered } = createHover()
  createEffect(() => highlightSignalObservers(signal, isHovered()))

  return (
    <div class={styles.SignalNode.container} {...hoverProps}>
      <div class={styles.SignalNode.name}>
        {signal.name}:{/* <span class={styles.SignalNode.id}>#{signal.id}</span> */}
      </div>
      <ValuePreview value={signal.value} updated={isUpdated()} highlighted={isHighlighted()} />
    </div>
  )
}
