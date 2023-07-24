import theme from './new-theme'

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
