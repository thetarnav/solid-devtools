import * as theme from '@solid-devtools/theme'
import * as uno from 'unocss'

export default uno.defineConfig({
    presets: [uno.presetUno({ dark: 'media' })],
    theme: {
        colors: theme.colors,

        spacing: theme.spacing,
        height: theme.spacing,
        minHeight: theme.spacing,
        maxHeight: theme.spacing,
        lineHeight: theme.spacing,
        width: theme.spacing,
        minWidth: theme.spacing,
        maxWidth: theme.spacing,

        fontFamily: theme.font,
        fontSize: theme.fontSize,
    },
    variants: [
        matcher => {
            const key = 'selected'
            if (!matcher.startsWith(key + ':')) return matcher
            return {
                matcher: matcher.slice(key.length + 1),
                selector: s => s + '[aria-selected=true]',
            }
        },
    ],
    rules: [],
    shortcuts: {
        'center-child': 'flex items-center justify-center',
    },
    preflights: [{ getCSS: () => reset }],
}) as any

/* http://meyerweb.com/eric/tools/css/reset/
   v2.0 | 20110126
   License: none (public domain)
*/
const reset = /*css*/ `
html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    font: inherit;
    vertical-align: baseline;
}
/* HTML5 display-role reset for older browsers */
article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section {
    display: block;
}
body {
    line-height: 1;
}
ol,ul {
    list-style: none;
}
blockquote,q {
    quotes: none;
}
blockquote:before,blockquote:after,q:before,q:after {
    content: '';
    content: none;
}
table {
    border-collapse: collapse;
    border-spacing: 0;
}
button {
    padding: 0;
    border: none;
    border-width: 0;
    background: transparent;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
}
input {
    font-size: inherit;
    font-family: inherit;
}
input[type='checkbox'] {
    margin: 0;
}
input[type='text'] {
    outline: unset;
    background: unset;
    border: unset;
    color: inherit;
}
*,*::before,*::after {
    box-sizing: border-box;
}

@media screen and (prefers-color-scheme: dark) {
    * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }
}
`
