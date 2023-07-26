import { theme } from '@/ui'
import { createToken, resolveTokens } from '@solid-primitives/jsx-tokenizer'
import { combineStyle } from '@solid-primitives/props'
import clsx from 'clsx'
import { Component, For, JSX, createSelector } from 'solid-js'

export type ToggleTabsOptionProps<T> = (T extends string
    ? { title?: string }
    : { title: string }) & {
    for: T
    class?: string
    children: JSX.Element
    style?: string | JSX.CSSProperties
}

/**
 * Controls the color of the tab background.
 */
export const toggle_tab_color_var = '--toggle-tab-color'

export function ToggleTabs<T>(props: {
    children: (Option: Component<ToggleTabsOptionProps<T>>) => JSX.Element
    active: T
    onSelect: (item: T) => void
    class?: string
}): JSX.Element {
    const isSelected = createSelector<T, T>(() => props.active)

    const Option = createToken<ToggleTabsOptionProps<T>>()

    const tokens = resolveTokens(Option, () => props.children(Option))

    return (
        <div
            class={clsx(props.class, 'flex items-stretch divide-x divide-solid divide-panel-2')}
            role="group"
        >
            <For each={tokens()}>
                {({ data }) => (
                    <button
                        title={data.title ?? String(data.for)}
                        class={clsx(
                            data.class,
                            'group relative p-x-2.5 center-child gap-x-1.5 outline-unset transition',
                            isSelected(data.for) ? 'text-text' : 'text-disabled',
                        )}
                        onClick={() => props.onSelect(data.for)}
                        style={combineStyle(
                            { [toggle_tab_color_var]: theme.vars.text.DEFAULT },
                            data.style ?? {},
                        )}
                    >
                        <div
                            class="absolute inset-0 -z-1 transition
                            opacity-0 group-hover:opacity-20 group-focus:opacity-20"
                            style={{
                                background: `radial-gradient(circle at 50% 130%, var(${toggle_tab_color_var}), transparent 70%)`,
                            }}
                        />
                        {data.children}
                    </button>
                )}
            </For>
        </div>
    )
}
