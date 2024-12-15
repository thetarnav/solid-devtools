import * as s from 'solid-js'
import {make_var_styles} from '@solid-devtools/shared/theme'
import {value_node_styles} from '../inspector.tsx'
import {owner_path_styles} from '../structure.tsx'
import * as ui from '../ui/index.ts'
import {highlight_styles} from './highlight.tsx'
import {custom_scrollbar_styles} from './scrollable.tsx'
import {toggle_button_styles} from './toggle-button.tsx'

export {
    highlight_color_var,
    highlight_container,
    highlight_element,
    highlight_opacity_var,
} from './highlight.tsx'

export {toggle_button, toggle_button_styles} from './toggle-button.tsx'

export const tag_brackets = 'tag_brackets'

export const tag_brackets_styles = /*css*/ `
    .${tag_brackets}:before {
        content: '\<';
        color: ${ui.vars.disabled};
    }
    .${tag_brackets}:after {
        content: '>';
        color: ${ui.vars.disabled};
    }
`

export const devtools_root_class = 'devtools-root'

export function Styles(): s.JSXElement {
    const var_styles = make_var_styles(devtools_root_class)

    return (
        <style>
            {var_styles}
            {toggle_button_styles}
            {highlight_styles}
            {owner_path_styles}
            {value_node_styles}
            {tag_brackets_styles}
            {custom_scrollbar_styles}
        </style>
    )
}
