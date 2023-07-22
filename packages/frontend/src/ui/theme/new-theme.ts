import theme, { hexToRgbValue } from '../../../../../configs/theme'
export default theme

export const toggle_button = 'toggle-button'

export const toggle_button_styles = /*css*/ `
    .toggle-button {
        display: flex;
        align-items: center;
        justify-content: center;
        --toggle-button-color: ${hexToRgbValue(theme.colors.gray[600])};
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
        --toggle-button-color: ${hexToRgbValue(theme.colors.cyan[600])};
        --toggle-button-bg-opacity: 0.05;
    }
    @media (prefers-color-scheme: dark) {
        .toggle-button {
            --toggle-button-color: ${hexToRgbValue(theme.colors.gray[400])};
        }
        .toggle-button:is([aria-selected="true"], [aria-expanded="true"]) {
            --toggle-button-color: ${hexToRgbValue(theme.colors.cyan[400])};
        }
    }
`
