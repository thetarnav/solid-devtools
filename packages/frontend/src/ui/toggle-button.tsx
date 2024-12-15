import clsx from 'clsx'
import * as s from 'solid-js'
import {combineProps} from '@solid-primitives/props'
import * as theme from '@solid-devtools/shared/theme'
import Icon from './icons.tsx'
import * as color from './color.ts'

export const toggle_button = 'toggle-button'

export const toggle_button_styles = /*css*/ `
    .toggle-button {
        display: flex;
        align-items: center;
        justify-content: center;
        --toggle-button-color: ${color.rgb_value(color.hex_to_rgb(theme.colors.gray[600]))};
        --toggle-button-color-opacity: 1;
        --toggle-button-bg-opacity: 0;
        --toggle-button-border-opacity: 0;
        color: rgb(var(--toggle-button-color) / var(--toggle-button-color-opacity));
        background-color: rgb(var(--toggle-button-color) / var(--toggle-button-bg-opacity));
        border: 1px solid rgb(var(--toggle-button-color) / var(--toggle-button-border-opacity));
        outline: unset;
        transition-property: color, background-color, border-color;
        transition-duration: ${theme.duration[200]};
    }
    .toggle-button:is(:hover, :active:hover) {
        --toggle-button-bg-opacity: 0.1;
    }
    .toggle-button:focus {
        --toggle-button-border-opacity: 0.3;
    }
    .toggle-button:active {
        --toggle-button-bg-opacity: 0.05;
    }
    .toggle-button:is([aria-selected="true"], [aria-expanded="true"]) {
        --toggle-button-color: ${color.rgb_value(color.hex_to_rgb(theme.colors.cyan[600]))};
        --toggle-button-bg-opacity: 0.05;
    }
    @media (prefers-color-scheme: dark) {
        .toggle-button {
            --toggle-button-color: ${color.rgb_value(color.hex_to_rgb(theme.colors.gray[400]))};
        }
        .toggle-button:is([aria-selected="true"], [aria-expanded="true"]) {
            --toggle-button-color: ${color.rgb_value(color.hex_to_rgb(theme.colors.cyan[400]))};
        }
    }
`

export const ToggleButton: s.ParentComponent<
    s.ComponentProps<'button'> & {onToggle: (selected: boolean) => void; selected: boolean}
> = props => {
    props = combineProps(props, {
        class: toggle_button,
        get 'aria-selected'() {
            return props.selected
        },
        onClick: () => props.onToggle(!props.selected),
    })

    // ! createToggleButton doesn't seems to passing class to buttonProps
    // let ref!: HTMLButtonElement
    // const { buttonProps } = createToggleButton(props, () => ref)

    return <button {...props} />
}

export const CollapseToggle: s.Component<{
    class?: string
    style?: string | s.JSX.CSSProperties
    iconClass?: string
    collapsed: boolean
    onToggle?: (newState: boolean) => void
    default_collapsed?: boolean
    name?: string
}> = props => {
    const {onToggle} = props

    return (
        <button
            class={clsx('h-4.5 w-4.5 shrink center-child', props.class)}
            style={props.style}
            aria-selected={props.collapsed}
            onClick={
                onToggle &&
                (e => {
                    e.stopPropagation()
                    onToggle(!props.collapsed)
                })
            }
            {...(props.name && {'aria-label': `Expand or collapse ${props.name}`})}
        >
            <Icon.Triangle
                class={clsx(
                    'w-2 h-2 text-panel-5 transition',
                    props.collapsed ? 'rotate-90' : 'rotate-180',
                    !props.default_collapsed === props.collapsed ? 'opacity-100' : 'opacity-50',
                    props.iconClass,
                )}
            />
        </button>
    )
}
