import { value_node_styles } from '@/modules/inspector/value-node'
import { owner_path_styles } from '@/modules/structure'
import { theme } from '@/ui'
import { make_var_styles } from '../../../../configs/theme'
import { highlight_styles } from './components/highlight'
import { custom_scrollbar_styles } from './components/scrollable'
import { toggle_button_styles } from './components/toggle-button'

export {
    highlight_color_var,
    highlight_container,
    highlight_element,
    highlight_opacity_var,
} from './components/highlight'

export { toggle_button, toggle_button_styles } from './components/toggle-button'

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

export const devtools_root_class = 'devtools-root'

export function Styles() {
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
