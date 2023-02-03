import { createJSXParser, createToken, resolveTokens } from '@solid-primitives/jsx-parser'
import clsx from 'clsx'
import { Component, createSelector, For, JSX } from 'solid-js'
import * as styles from './toggle-tabs.css'

export type ToggleTabsOptionProps<T> = { for: T; class?: string; children: JSX.Element }

export function ToggleTabs<T>(props: {
  children: (Option: Component<ToggleTabsOptionProps<T>>) => JSX.Element
  active: T
  onSelect: (item: T) => void
  class?: string
}): JSX.Element {
  const isSelected = createSelector<T, T>(() => props.active)

  const Parser = createJSXParser<ToggleTabsOptionProps<T>>()
  const Option = createToken(Parser)

  const tokens = resolveTokens(Parser, () => props.children(Option))

  return (
    <div class={clsx(props.class, styles.list)} role="group">
      <For each={tokens()}>
        {({ data }) => (
          <button
            aria-selected={isSelected(data.for)}
            class={clsx(data.class, styles.item)}
            onClick={() => props.onSelect(data.for)}
          >
            {data.children}
          </button>
        )}
      </For>
    </div>
  )
}
