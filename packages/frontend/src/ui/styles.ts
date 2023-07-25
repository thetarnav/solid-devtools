import theme from './theme/new-theme'

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
