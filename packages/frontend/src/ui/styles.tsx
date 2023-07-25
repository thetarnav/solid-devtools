import { theme } from '@/ui'
import { color } from '@nothing-but/utils'

export const tag_brackets = 'tag_brackets'

export const tag_brackets_styles = /*css*/ `
    .${tag_brackets}:before {
        content: '<';
        color: ${theme.vars.disabled};
    }
    .${tag_brackets}:after {
        content: '>';
        color: ${theme.vars.disabled};
    }
`

export const highlight_color_var = '--highlight_color_var'
export const highlight_opacity_var = '--highlight_opacity_var'

export const highlight_container = 'relative z-1'
export const highlight_element = `highlight_element absolute -z-1 inset-y-0 -inset-x-1 rounded transition-opacity`
export const highlight_styles = /*css*/ `
    .highlight_element {
        background-color: var(${highlight_color_var}, ${theme.vars.highlight.bg});
        opacity: var(${highlight_opacity_var}, 0);
    }
`

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
