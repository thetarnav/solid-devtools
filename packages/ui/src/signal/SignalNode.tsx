import { Component, createEffect, createMemo, For, Match, Show, Switch } from "solid-js"
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

const StringValuePreview: ValueComponent<ValueType.String> = props => (
  <span class={styles.ValueString}>"{props.value}"</span>
)

const NumberValuePreview: ValueComponent<ValueType.Number> = props => {
  const value = () => {
    switch (props.value) {
      case "__$sdt-NaN__":
        return "NaN"
      case "__$sdt-Infinity__":
        return "Infinity"
      case "__$sdt-NegativeInfinity__":
        return "-Infinity"
      default:
        return props.value
    }
  }
  return <span class={styles.ValueNumber}>{value()}</span>
}

const BooleanValuePreview: ValueComponent<ValueType.Boolean> = props => (
  <input
    type="checkbox"
    class={styles.ValueBoolean}
    onClick={e => e.preventDefault()}
    checked={props.value}
  ></input>
)

const ObjectValuePreview: ValueComponent<ValueType.Object> = props => (
  <span class={styles.ValueObject}>…</span>
)

const ArrayValuePreview: ValueComponent<ValueType.Array> = props => (
  <Show when={props.value > 0} fallback={<span class={styles.EmptyArray}>Empty Array</span>}>
    <span>Array [{props.value}]</span>
  </Show>
)

const FunctionValuePreview: ValueComponent<ValueType.Function> = props => (
  <span class={styles.ValueFunction}>{props.value ? `f ${props.value}()` : "function()"}</span>
)

const NullableValuePreview: Component<{ value: null | undefined }> = props => (
  <span class={styles.Nullable}>{props.value === null ? "null" : "undefined"}</span>
)

const SymbolValuePreview: ValueComponent<ValueType.Symbol> = props => (
  <span>Symbol({props.value})</span>
)

const InstanceValuePreview: ValueComponent<ValueType.Instance> = props => <span>{props.value}</span>

const ElementValuePreview: ValueComponent<ValueType.Element> = props => (
  <span class={styles.ValueElement}>{props.value}</span>
)

const ValuePreview: Component<{
  updated?: boolean
  highlighted?: boolean
  value: EncodedPreview
}> = props => {
  const Value = createMemo(() => {
    switch (props.value.type) {
      case ValueType.String:
        return <StringValuePreview value={props.value.value} />
      case ValueType.Number:
        return <NumberValuePreview value={props.value.value} />
      case ValueType.Boolean:
        return <BooleanValuePreview value={props.value.value} />
      case ValueType.Object:
        return <ObjectValuePreview />
      case ValueType.Array:
        return <ArrayValuePreview value={props.value.value} />
      case ValueType.Function:
        return <FunctionValuePreview value={props.value.value} />
      case ValueType.Null:
        return <NullableValuePreview value={null} />
      case ValueType.Undefined:
        return <NullableValuePreview value={undefined} />
      case ValueType.Symbol:
        return <SymbolValuePreview value={props.value.value} />
      case ValueType.Instance:
        return <InstanceValuePreview value={props.value.value} />
      case ValueType.Element:
        return <ElementValuePreview value={props.value.value} />
      // default:
      //   return <span>{ValueType[props.value.type]}</span>
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
