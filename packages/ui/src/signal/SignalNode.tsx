import { Component, createEffect, createMemo, For, Show } from "solid-js"
import { GraphSignal, NodeType } from "@solid-devtools/shared/graph"
import { createHover } from "@solid-aria/interactions"
import { EncodedValue, EncodedValueOf, ValueType } from "@solid-devtools/shared/serialize"
import * as Icon from "~/icons"
import { color, theme } from "~/theme"
import { useHighlights, useSignalContext } from "../ctx/highlights"
import { Highlight } from "../highlight/Highlight"
import * as styles from "./SignalNode.css"

type ValueComponent<K extends ValueType> = Component<Omit<EncodedValueOf<K>, "type">>

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
  value: EncodedValue
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
    <Highlight strong={props.updated} light={props.highlighted} signal class={styles.ValuePreview}>
      <Value />
    </Highlight>
  )
}

export const Signals: Component<{ each: GraphSignal[] }> = props => {
  const sorted = createMemo(() =>
    props.each.slice().sort((a, b) => {
      if (a.type === b.type) return a.id > b.id ? 1 : -1
      return a.type === NodeType.Memo ? 1 : -1
    }),
  )
  return (
    <Show when={props.each.length}>
      <div class={styles.Signals.container}>
        <For each={sorted()}>{signal => <SignalNode signal={signal} />}</For>
      </div>
    </Show>
  )
}

export const SignalNode: Component<{ signal: GraphSignal }> = ({ signal }) => {
  const { type } = signal
  const { useUpdatedSelector } = useSignalContext()

  const isUpdated = useUpdatedSelector(signal.id)

  const { highlightSignalObservers, isSourceHighlighted } = useHighlights()
  const isHighlighted = isSourceHighlighted.bind(null, signal)

  const { hoverProps, isHovered } = createHover()
  createEffect(() => highlightSignalObservers(signal, isHovered()))

  return (
    <div
      class={styles.SignalNode.container}
      {...hoverProps}
      onClick={() => {
        console.log("HELLOs")
      }}
    >
      <div class={styles.SignalNode.highlight} />
      <div class={styles.SignalNode.icon}>
        {type === NodeType.Memo ? (
          <Icon.Memo bgColor={color.amber[400]} />
        ) : (
          <div class={styles.SignalNode.signalDot} />
        )}
      </div>
      <div class={styles.SignalNode.name}>
        {signal.name}
        {/* <span class={styles.SignalNode.id}>#{signal.id}</span> */}
      </div>
      <ValuePreview value={signal.value} updated={isUpdated()} highlighted={isHighlighted()} />
    </div>
  )
}
