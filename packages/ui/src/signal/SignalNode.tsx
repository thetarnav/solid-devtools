import {
  Accessor,
  Component,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  Show,
  Switch,
  useContext,
} from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { GraphSignal, NodeID, NodeType } from "@solid-devtools/shared/graph"
import { createHover } from "@solid-aria/interactions"
import { EncodedValue, EncodedValueOf, ValueType } from "@solid-devtools/shared/serialize"
import * as Icon from "~/icons"
import { color } from "~/theme"
import { useHighlights } from "../ctx/highlights"
import { Highlight } from "../highlight/Highlight"
import * as styles from "./SignalNode.css"
import clsx from "clsx"

type ValueComponent<K extends ValueType> = Component<Omit<EncodedValueOf<K, boolean>, "type">>

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

const CollapsableObjectPreview: Component<{
  value:
    | EncodedValueOf<ValueType.Object, true>["value"]
    | EncodedValueOf<ValueType.Array, true>["value"]
  extended?: boolean
  array?: boolean
}> = props => {
  const [collapsed, setCollapsed] = createSignal(!(props.extended === true))
  return (
    <div>
      <div>{"["}</div>
      <ul>
        <Key each={Object.entries(props.value)} by={0}>
          {keyvalue => (
            <li>
              <div>{keyvalue()[0]}</div>
              <ValuePreview value={keyvalue()[1]} />
            </li>
          )}
        </Key>
      </ul>
      <div>{"]"}</div>
    </div>
  )
}

const ObjectValuePreview: Component<{
  value: EncodedValueOf<ValueType.Object, boolean>["value"]
  topmost?: boolean
}> = props => {
  return (
    <Show when={props.value} fallback={<span class={styles.ValueObject}>…</span>}>
      {value => <CollapsableObjectPreview value={value} extended={props.topmost} />}
    </Show>
  )
}

const ArrayHead: Component<{ value: number }> = props => (
  <Show when={props.value > 0} fallback={<span class={styles.EmptyArray}>Empty Array</span>}>
    <span>Array [{props.value}]</span>
  </Show>
)

const ArrayValuePreview: Component<{
  value: EncodedValueOf<ValueType.Array, boolean>["value"]
  topmost?: boolean
}> = props => (
  <Switch>
    <Match when={typeof props.value === "number" && props.value}>
      {length => <ArrayHead value={length} />}
    </Match>
    <Match when={typeof props.value === "object" && props.value}>
      {value => <CollapsableObjectPreview value={value} extended={props.topmost} array />}
    </Match>
  </Switch>
)

const ValuePreview: Component<{ value: EncodedValue<boolean>; topmost?: boolean }> = props => {
  const { topmost } = props
  return createMemo(() => {
    switch (props.value.type) {
      case ValueType.String:
        return <StringValuePreview value={props.value.value} />
      case ValueType.Number:
        return <NumberValuePreview value={props.value.value} />
      case ValueType.Boolean:
        return <BooleanValuePreview value={props.value.value} />
      case ValueType.Object:
        return <ObjectValuePreview value={props.value.value} topmost={topmost} />
      case ValueType.Array:
        return <ArrayValuePreview value={props.value.value} topmost={topmost} />
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

export type SignalContextState = {
  useUpdatedSelector: (id: NodeID) => Accessor<boolean>
  toggleSignalFocus: (signal: NodeID, focused?: boolean) => void
  useFocusedSelector: (id: NodeID) => Accessor<boolean>
}

const SignalContext = createContext<SignalContextState>()

export const SignalContextProvider = SignalContext.Provider

const useSignalContext = (): SignalContextState => {
  const ctx = useContext(SignalContext)
  if (!ctx) throw "SignalContext wasn't provided."
  return ctx
}

export const SignalNode: Component<{ signal: GraphSignal }> = ({ signal }) => {
  const { type, id } = signal
  const { useUpdatedSelector, toggleSignalFocus, useFocusedSelector } = useSignalContext()

  const isUpdated = useUpdatedSelector(id)
  const isFocused = useFocusedSelector(id)

  const { highlightSignalObservers, isSourceHighlighted } = useHighlights()
  const isHighlighted = isSourceHighlighted.bind(null, signal)

  const { hoverProps, isHovered } = createHover()
  createEffect(() => highlightSignalObservers(signal, isHovered()))

  return (
    <div
      class={clsx(styles.SignalNode.container, isFocused() && styles.SignalNode.containerFocused)}
      {...hoverProps}
      onClick={() => toggleSignalFocus(id)}
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

      <Highlight strong={isUpdated()} light={isHighlighted()} signal class={styles.ValuePreview}>
        <ValuePreview value={signal.value} topmost />
      </Highlight>
    </div>
  )
}
