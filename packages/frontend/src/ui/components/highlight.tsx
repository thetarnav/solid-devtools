import {theme} from '@/ui'
import clsx from 'clsx'
import {ParentComponent} from 'solid-js'

export const highlight_color_var = '--highlight_color_var'
export const highlight_opacity_var = '--highlight_opacity_var'

export const highlight_container = 'relative z-1'
export const highlight_element = `highlight_element absolute -z-1 inset-y-0 -inset-x-1 rounded transition-opacity`
export const highlight_styles = /*css*/ `
    .highlight_element {
        background-color: var(${highlight_color_var}, ${theme.vars.highlight.bg});
        opacity: var(${highlight_opacity_var}, 0);
    }
    @media (prefers-color-scheme: dark) {
        .highlight_element {
            opacity: calc(var(${highlight_opacity_var}, 0) / 2);
        }
    }
`

export const Highlight: ParentComponent<{
    isSignal?: boolean
    highlight?: boolean
    class?: string
}> = props => {
    return (
        <div class={clsx(highlight_container, props.highlight && 'light:text-black', props.class)}>
            <div
                class={highlight_element}
                style={{
                    [highlight_color_var]: props.isSignal
                        ? theme.colors.amber[500]
                        : theme.colors.cyan[400],
                    [highlight_opacity_var]: props.highlight ? 0.6 : 0,
                }}
            ></div>
            {props.children}
        </div>
    )
}
