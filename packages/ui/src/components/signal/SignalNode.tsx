import {
  Accessor,
  Component,
  createContext,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  ParentComponent,
  Setter,
  Show,
  splitProps,
  Switch,
  useContext,
} from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { Graph, NodeID, NodeType } from "@solid-devtools/shared/graph"
import {
  EncodedValue,
  EncodedValueOf,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  ValueType,
} from "@solid-devtools/shared/serialize"
import * as Icon from "~/icons"
import { color } from "~/theme"
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
      case NAN:
        return "NaN"
      case INFINITY:
        return "Infinity"
      case NEGATIVE_INFINITY:
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
  <span class={styles.baseValue}>Symbol({props.value})</span>
)

const InstanceValuePreview: ValueComponent<ValueType.Instance> = props => (
  <span class={styles.baseValue}>{props.value}</span>
)

const ElementValuePreview: ValueComponent<ValueType.Element> = props => {
  const { setHoveredElement } = useSignalContext()

  const toggleHovered = (state: boolean) => {
    if (props.value.id === undefined) return
    setHoveredElement(state ? props.value.id : p => (p === props.value.id ? null : p))
  }

  onCleanup(() => toggleHovered(false))

  return (
    <span
      class={styles.ValueElement.container}
      onMouseEnter={() => toggleHovered(true)}
      onMouseLeave={() => toggleHovered(false)}
    >
      <div class={styles.ValueElement.highlight} />
      {props.value.name}
    </span>
  )
}

const ObjectValuePreview: Component<
  EncodedValueOf<ValueType.Object | ValueType.Array, boolean> & { extended?: boolean }
> = props => (
  <Switch>
    <Match when={!props.children || props.value === 0 || props.extended === false}>
      <Show
        when={props.value > 0}
        fallback={
          <span class={styles.Nullable}>
            Empty {props.type === ValueType.Array ? "Array" : "Object"}
          </span>
        }
      >
        <span class={styles.baseValue}>
          {props.type === ValueType.Array ? "Array" : "Object"} [{props.value}]
        </span>
      </Show>
    </Match>
    <Match when={props.children}>{value => <CollapsableObjectPreview value={value} />}</Match>
  </Switch>
)

const CollapsableObjectPreview: Component<{
  value:
    | EncodedValueOf<ValueType.Object, true>["children"]
    | EncodedValueOf<ValueType.Array, true>["children"]
}> = props => (
  <ul class={styles.collapsable.list}>
    <Key each={Object.entries(props.value)} by={0}>
      {keyvalue => {
        // TODO: is <Key> necessary here? the values should be reconciled by the key anyway
        // key will be static, because <Key> is using it as a key
        const key = keyvalue()[0]
        const value = () => keyvalue()[1]
        return (
          <Show
            when={value().type === ValueType.Object || value().type === ValueType.Array}
            fallback={
              <ValueRow>
                <ValueName>{key}</ValueName>
                <ValuePreview value={value()} />
              </ValueRow>
            }
          >
            {() => {
              const [extended, setExtended] = createSignal(false)
              return (
                <ValueRow
                  selected={false}
                  onClick={e => {
                    e.stopPropagation()
                    setExtended(p => !p)
                  }}
                >
                  <ValueName>{key}</ValueName>
                  <ObjectValuePreview
                    {...(value() as
                      | EncodedValueOf<ValueType.Object, true>
                      | EncodedValueOf<ValueType.Array, true>)}
                    extended={extended()}
                  />
                </ValueRow>
              )
            }}
          </Show>
        )
      }}
    </Key>
  </ul>
)

const ValuePreview: Component<{ value: EncodedValue<boolean> }> = props =>
  createMemo(() => {
    switch (props.value.type) {
      case ValueType.String:
        return <StringValuePreview value={props.value.value} />
      case ValueType.Number:
        return <NumberValuePreview value={props.value.value} />
      case ValueType.Boolean:
        return <BooleanValuePreview value={props.value.value} />
      case ValueType.Object:
      case ValueType.Array:
        return <ObjectValuePreview {...props.value} />
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

const ValueName: ParentComponent<{ type?: NodeType.Signal | NodeType.Memo | null }> = props => {
  const IconComponent = createMemo(() => {
    switch (props.type) {
      case NodeType.Signal:
        return <div class={styles.ValueName.signalDot} />
      case NodeType.Memo:
        return <Icon.Memo bgColor={color.amber[400]} class={styles.ValueName.icon} />
      default:
        return null
    }
  })

  return (
    <div class={styles.ValueName.container}>
      <div class={styles.ValueName.iconWrapper}>{<IconComponent />}</div>
      <div class={styles.ValueName.name}>{props.children}</div>
    </div>
  )
}

const ValueRow: ParentComponent<{ selected?: boolean } & JSX.IntrinsicElements["li"]> = props => {
  const [, attrs] = splitProps(props, ["selected", "children", "class"])

  // early return if this value in not selectable (if undefined, this shouldn't be assigned again)
  if (props.selected === undefined) {
    return (
      <li {...attrs} class={clsx(styles.ValueRow.container, props.class)}>
        {props.children}
      </li>
    )
  }

  const [isHovered, setIsHovered] = createSignal(false)
  return (
    <li
      {...attrs}
      class={clsx(
        styles.ValueRow.container,
        props.selected && styles.ValueRow.containerFocused,
        isHovered() && styles.ValueRow.containerHovered,
        props.class,
      )}
      onPointerOver={e => {
        e.stopPropagation()
        setIsHovered(true)
      }}
      onPointerOut={e => {
        e.stopPropagation()
        setIsHovered(false)
      }}
    >
      <div class={styles.ValueRow.highlight} />
      {props.children}
    </li>
  )
}

export const Signals: Component<{ each: Graph.Signal[] }> = props => {
  const sorted = createMemo(() =>
    props.each.slice().sort((a, b) => {
      if (a.type === b.type) return a.id > b.id ? 1 : -1
      return a.type === NodeType.Memo ? 1 : -1
    }),
  )
  return (
    <Show when={props.each.length}>
      <ul class={styles.Signals.container}>
        <For each={sorted()}>{signal => <SignalNode signal={signal} />}</For>
      </ul>
    </Show>
  )
}

export type SignalContextState = {
  useUpdatedSelector: (id: NodeID) => Accessor<boolean>
  toggleSignalFocus: (signal: NodeID, focused?: boolean) => void
  setHoveredElement: Setter<string | null>
}

const SignalContext = createContext<SignalContextState>()

export const SignalContextProvider = SignalContext.Provider

const useSignalContext = (): SignalContextState => {
  const ctx = useContext(SignalContext)
  if (!ctx) throw "SignalContext wasn't provided."
  return ctx
}

export const SignalNode: Component<{ signal: Graph.Signal }> = ({ signal }) => {
  const { type, id } = signal
  const { useUpdatedSelector, toggleSignalFocus } = useSignalContext()

  const isUpdated = useUpdatedSelector(id)

  return (
    <ValueRow selected={signal.selected} onClick={() => toggleSignalFocus(id)}>
      <ValueName type={type}>
        <Highlight strong={isUpdated()} light={false} signal class={styles.ValueName.highlight}>
          {signal.name}
        </Highlight>
      </ValueName>
      <ValuePreview value={signal.value} />
    </ValueRow>
  )
}
