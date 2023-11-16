/**
 * Some icons taken from https://phosphoricons.com
 */

import {Component} from 'solid-js'

export type ProxyIconComponent<ID extends keyof typeof embedIconComponents> = Component<{id: ID}>

export type IconComponent = Component<{class?: string}>

const ArrowRight: ProxyIconComponent<'ArrowRight'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M40 128h176"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M144 56l72 72-72 72"
        />
    </svg>
)

const ArrowLeft: ProxyIconComponent<'ArrowLeft'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M216 128H40"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M112 56l-72 72 72 72"
        />
    </svg>
)

const CarretRight: ProxyIconComponent<'CarretRight'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M96 48l80 80-80 80"
        />
    </svg>
)

const Eye: ProxyIconComponent<'Eye'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M128 56c-80 0-112 72-112 72s32 72 112 72 112-72 112-72-32-72-112-72zm0 112a40 40 0 1 1 40-40 40 40 0 0 1-40 40z"
            opacity="0.2"
            fill="currentColor"
        />
        <path
            d="M128 56c-80 0-112 72-112 72s32 72 112 72 112-72 112-72-32-72-112-72z"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle
            cx="128"
            cy="128"
            r="40"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const EyeSlash: ProxyIconComponent<'EyeSlash'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M128 56c-80 0-112 72-112 72s32 72 112 72 112-72 112-72-32-72-112-72zm0 112a40 40 0 1 1 40-40 40 40 0 0 1-40 40z"
            opacity="0.2"
            fill="currentColor"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M48 40l160 176"
        />
        <path
            d="M154.9 157.6A39.6 39.6 0 0 1 128 168a40 40 0 0 1-26.9-69.6"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            d="M74 68.6C33.2 89.2 16 128 16 128s32 72 112 72a117.9 117.9 0 0 0 54-12.6"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            d="M208.6 169.1C230.4 149.6 240 128 240 128s-32-72-112-72a123.9 123.9 0 0 0-20.7 1.7"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            d="M135.5 88.7a39.9 39.9 0 0 1 32.3 35.5"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Refresh: ProxyIconComponent<'Refresh'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M176.2 99.7h48v-48"
        />
        <path
            d="M190.2 190.2a88 88 0 1 1 0-124.4l34 33.9"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Select: ProxyIconComponent<'Select'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <circle cx="128" cy="128" r="32" opacity="0.2" fill="currentColor" />
        <circle
            cx="128"
            cy="128"
            r="88"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M128 20v40"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M20 128h40"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M128 236v-40"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M236 128h-40"
        />
        <circle
            cx="128"
            cy="128"
            r="32"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Options: ProxyIconComponent<'Options'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <circle cx="128" cy="128" opacity="0.2" fill="currentColor" />
        <circle cx="128" cy="48" opacity="0.2" fill="currentColor" />
        <circle cx="128" cy="208" opacity="0.2" fill="currentColor" />
        <circle
            cx="128"
            cy="128"
            r="24"
            stroke="currentColor"
            stroke-miterlimit="10"
            stroke-width="16"
        />
        <circle
            cx="128"
            cy="48"
            r="24"
            stroke="currentColor"
            stroke-miterlimit="10"
            stroke-width="16"
        />
        <circle
            cx="128"
            cy="208"
            r="24"
            stroke="currentColor"
            stroke-miterlimit="10"
            stroke-width="16"
        />
    </svg>
)

const Close: ProxyIconComponent<'Close'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M200 56L56 200"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M200 200L56 56"
        />
    </svg>
)

const Triangle: ProxyIconComponent<'Triangle'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            fill="currentColor"
            d="M236.7 188L148.8 36a24 24 0 0 0-41.6 0L19.3 188A23.9 23.9 0 0 0 40 224h176a23.9 23.9 0 0 0 20.7-36z"
        />
    </svg>
)

const Signal: ProxyIconComponent<'Signal'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <circle cx="128" cy="128" r="96" fill="currentColor" opacity=".2"></circle>
        <circle
            cx="128"
            cy="128"
            r="96"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        ></circle>
    </svg>
)

const Root: ProxyIconComponent<'Root'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M213.4 109.6l-80-72.7a8 8 0 0 0-10.8 0l-80 72.7a8.3 8.3 0 0 0-2.6 5.9V208a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8v-92.5a8.3 8.3 0 0 0-2.6-5.9z"
            opacity="0.2"
            fill="currentColor"
        />
        <path
            d="M213.4 109.6l-80-72.7a8 8 0 0 0-10.8 0l-80 72.7a8.3 8.3 0 0 0-2.6 5.9V208a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8v-92.5a8.3 8.3 0 0 0-2.6-5.9z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Memo: ProxyIconComponent<'Memo'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M10 27V19C10 18.7348 10.1054 18.4804 10.2929 18.2929C10.4804 18.1054 10.7348 18 11 18H21C21.2652 18 21.5196 18.1054 21.7071 18.2929C21.8946 18.4804 22 18.7348 22 19V27H26C26.2652 27 26.5196 26.8946 26.7071 26.7071C26.8946 26.5196 27 26.2652 27 26V11.4125C27.0005 11.2827 26.9753 11.154 26.926 11.0339C26.8766 10.9138 26.8041 10.8046 26.7125 10.7125L21.2875 5.28751C21.1955 5.19591 21.0862 5.12338 20.9661 5.07404C20.846 5.02471 20.7174 4.99955 20.5875 5.00001H6C5.73478 5.00001 5.48043 5.10536 5.29289 5.2929C5.10536 5.48044 5 5.73479 5 6.00001V26C5 26.2652 5.10536 26.5196 5.29289 26.7071C5.48043 26.8946 5.73478 27 6 27H10Z"
            opacity="0.2"
            fill="currentColor"
        />
        <path
            d="M27 11.4125V26C27 26.2652 26.8946 26.5196 26.7071 26.7071C26.5196 26.8946 26.2652 27 26 27H6C5.73478 27 5.48043 26.8946 5.29289 26.7071C5.10536 26.5196 5 26.2652 5 26V6.00001C5 5.73479 5.10536 5.48044 5.29289 5.2929C5.48043 5.10536 5.73478 5.00001 6 5.00001H20.5875C20.7174 4.99955 20.846 5.02471 20.9661 5.07404C21.0862 5.12338 21.1955 5.19591 21.2875 5.28751L26.7125 10.7125C26.8041 10.8046 26.8766 10.9138 26.926 11.0339C26.9753 11.154 27.0005 11.2827 27 11.4125V11.4125Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <path
            d="M10 27V19C10 18.7348 10.1054 18.4804 10.2929 18.2929C10.4804 18.1054 10.7348 18 11 18H21C21.2652 18 21.5196 18.1054 21.7071 18.2929C21.8946 18.4804 22 18.7348 22 19V27"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <path
            d="M19 9H12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
)

const Effect: ProxyIconComponent<'Effect'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <ellipse
            cx="128"
            cy="128"
            rx="44"
            ry="116"
            transform="rotate(-45 128.01 127.977)"
            opacity="0.2"
            fill="currentColor"
        />
        <ellipse
            cx="128"
            cy="128"
            rx="44"
            ry="116"
            transform="rotate(-45 128.01 127.977)"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <ellipse
            cx="128"
            cy="128"
            rx="116"
            ry="44"
            transform="rotate(-45 128.01 127.977)"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle cx="128" cy="128" r="12" fill="currentColor" />
    </svg>
)

const RenderEffect: ProxyIconComponent<'RenderEffect'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M215.9 73.7l-84-47.5a7.8 7.8 0 0 0-7.8 0l-84 47.5a8.1 8.1 0 0 0-4.1 7v94.6a8.1 8.1 0 0 0 4.1 7l84 47.5a7.8 7.8 0 0 0 7.8 0l84-47.5a8.1 8.1 0 0 0 4.1-7V80.7a8.1 8.1 0 0 0-4.1-7zM128 164a36 36 0 1 1 36-36 36 36 0 0 1-36 36z"
            opacity="0.2"
            fill="currentColor"
        />
        <path
            d="M220 175.3V80.7a8.1 8.1 0 0 0-4.1-7l-84-47.5a7.8 7.8 0 0 0-7.8 0l-84 47.5a8.1 8.1 0 0 0-4.1 7v94.6a8.1 8.1 0 0 0 4.1 7l84 47.5a7.8 7.8 0 0 0 7.8 0l84-47.5a8.1 8.1 0 0 0 4.1-7z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle
            cx="128"
            cy="128"
            r="36"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Computation: ProxyIconComponent<'Computation'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M229.6 106l-25.9-14.4a73.6 73.6 0 0 0-6.3-10.9l.5-29.7a102.6 102.6 0 0 0-38.2-22l-25.4 15.2a88.3 88.3 0 0 0-12.6 0L96.2 28.9A104 104 0 0 0 58.1 51l.5 29.7a73.6 73.6 0 0 0-6.3 10.9l-26 14.4a103.6 103.6 0 0 0 .1 44l25.9 14.4a80.1 80.1 0 0 0 6.3 11l-.5 29.6a102.6 102.6 0 0 0 38.2 22l25.4-15.2a88.3 88.3 0 0 0 12.6 0l25.5 15.3a104 104 0 0 0 38.1-22.1l-.5-29.7a73.6 73.6 0 0 0 6.3-10.9l26-14.4a102 102 0 0 0-.1-44zM128 176a48 48 0 1 1 48-48 48 48 0 0 1-48 48z"
            opacity="0.2"
            fill="currentColor"
        />
        <circle
            cx="128"
            cy="128"
            r="48"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            d="M197.4 80.7a73.6 73.6 0 0 1 6.3 10.9l25.9 14.4a102 102 0 0 1 .1 44l-26 14.4a73.6 73.6 0 0 1-6.3 10.9l.5 29.7a104 104 0 0 1-38.1 22.1l-25.5-15.3a88.3 88.3 0 0 1-12.6 0L96.3 227a102.6 102.6 0 0 1-38.2-22l.5-29.6a80.1 80.1 0 0 1-6.3-11L26.4 150a103.6 103.6 0 0 1-.1-44l26-14.4a73.6 73.6 0 0 1 6.3-10.9L58.1 51a104 104 0 0 1 38.1-22.1l25.5 15.3a88.3 88.3 0 0 1 12.6 0L159.7 29a102.6 102.6 0 0 1 38.2 22z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Context: ProxyIconComponent<'Context'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor">
            <rect x="24" y="100" width="56" height="56" rx="8" opacity="0.2" />
            <rect x="160" y="40" width="64" height="64" rx="8" opacity="0.2" />
            <rect x="160" y="152" width="64" height="64" rx="8" opacity="0.2" />
            <rect
                x="24"
                y="100"
                width="56"
                height="56"
                rx="8"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
            />
            <rect
                x="160"
                y="40"
                width="64"
                height="64"
                rx="8"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
            />
            <rect
                x="160"
                y="152"
                width="64"
                height="64"
                rx="8"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
            />
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
                d="M80 128h40"
            />
            <path
                d="M160 184h-16a23.9 23.9 0 0 1-24-24V96a23.9 23.9 0 0 1 24-24h16"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
            />
        </g>
    </svg>
)

const Code: ProxyIconComponent<'Code'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path opacity=".2" d="M152 32v56h56l-56-56z" />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M152 32v56h56"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M148 128l24 24-24 24"
        />
        <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M108 128l-24 24 24 24"
        />
        <path
            d="M200 224a8 8 0 0 0 8-8V88l-56-56H56a8 8 0 0 0-8 8v176a8 8 0 0 0 8 8z"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
    </svg>
)

const Graph: ProxyIconComponent<'Graph'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <circle cx="128" cy="128" r="24" opacity=".2" />
        <circle
            cx="128"
            cy="128"
            r="24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle
            cx="96"
            cy="56"
            r="24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle
            cx="200"
            cy="104"
            r="24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle
            cx="200"
            cy="184"
            r="24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <circle
            cx="56"
            cy="192"
            r="24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M118.3 106.1l-12.6-28.2"
        />
        <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M177.2 111.6l-26.4 8.8"
        />
        <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M181.1 169.3l-34.2-26.6"
        />
        <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M110.1 143.9l-36.2 32.2"
        />
    </svg>
)

const Search: ProxyIconComponent<'Search'> = ({id}) => (
    <svg id={`sdt_icon_${id}`} fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <circle
            cx="116"
            cy="116"
            r="84"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
        />
        <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="16"
            d="M175.4 175.4L224 224"
        />
    </svg>
)

export const SolidWhite: IconComponent = props => (
    <svg viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg" class={props.class}>
        <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M0 17.5569L3.02113 12.2752L12.3803 9.25407C13.6743 8.86604 15.0548 8.87396 16.3442 9.2768C17.6337 9.67965 18.7732 10.459 19.6162 11.5146C19.9908 12.0056 20.2184 12.5928 20.2726 13.2079C20.3269 13.8231 20.2055 14.441 19.9225 14.99L17.1761 19.8914C17.3586 19.4022 17.4049 18.8726 17.3101 18.3591C17.2152 17.8456 16.9827 17.3676 16.6373 16.9759L16.4894 16.7963C15.6604 15.7712 14.5635 14.996 13.3204 14.5569C12.0297 14.1607 10.6499 14.1607 9.35916 14.5569L2.5669 16.7224L0 17.5569Z"
            fill="url(#paint0_linear_505_5)"
        />
        <g opacity="0.84">
            <path
                d="M0.000222357 17.557L0.68662 18.0427L1.34155 18.4758C2.44645 19.1816 3.5929 19.82 4.77465 20.3878C7.04542 21.5449 9.5383 22.2005 12.0845 22.3103C12.7958 22.3112 13.5047 22.2297 14.1972 22.0674L14.662 21.9089C15.6807 21.4931 16.5541 20.7883 17.1769 19.8892C17.3588 19.4006 17.4048 18.8719 17.3101 18.3593C17.2239 17.8932 17.0245 17.4564 16.7301 17.0868L15.8451 18.6448C15.4278 19.3734 14.7763 19.9393 13.9965 20.2505L13.7746 20.3244C11.0916 20.9688 7.84859 19.8174 5.58803 18.7505C4.49851 18.232 3.44035 17.65 2.41901 17.0075L2.5802 16.7178L0.172375 17.501L0.000222357 17.557Z"
                fill="url(#paint1_linear_505_5)"
            />
            <path
                d="M0.000161216 17.5568L0 17.5568L9.35076e-05 17.5569L0.000161216 17.5568Z"
                fill="url(#paint2_linear_505_5)"
            />
        </g>
        <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M24 4.72201L21.2852 9.2537C20.663 8.80146 20.0178 8.38188 19.3521 7.99666C16.7641 6.44384 12.0739 4.09877 8.0387 4.59525C7.77226 4.6212 7.50768 4.66353 7.24644 4.72201L6.64433 4.8699C5.89184 5.06977 5.21775 5.49338 4.71123 6.08469L4.58447 6.24314L4.67954 6.08469L6.94011 2.11286L7.24644 1.65863C7.79758 1.00447 8.53427 0.53299 9.35912 0.306519L9.81335 0.200886C15.9929 -1.16179 24 4.72201 24 4.72201Z"
            fill="url(#paint3_linear_505_5)"
        />
        <g opacity="0.84">
            <path
                d="M4.71092 6.085L4.71456 6.08068C5.22066 5.49158 5.89332 5.06952 6.64402 4.87012L7.24614 4.72223C7.49702 4.66607 7.751 4.6248 8.00674 4.59863L7.32007 5.12373C7.24377 5.26786 7.16066 5.40519 7.08167 5.53571L7.0816 5.53582L7.08151 5.53597L7.08118 5.53652C7.06192 5.56834 7.04291 5.59976 7.0243 5.63077C6.74965 6.07443 6.51726 6.45471 6.26374 6.93007L6.18979 7.04626C5.95849 7.34984 5.83322 7.72095 5.83322 8.1026C5.83322 8.48426 5.95849 8.85536 6.18979 9.15894C6.76766 9.8101 7.51012 10.2936 8.33913 10.5587L5.93566 11.3346C5.47405 11.0161 5.06144 10.6319 4.71092 10.1942C4.29779 9.62354 4.06493 8.94232 4.04234 8.23822C4.01975 7.53411 4.20846 6.83937 4.58416 6.24345L4.71092 6.085Z"
                fill="url(#paint4_linear_505_5)"
            />
            <path
                d="M18.2975 10.2568L21.2838 9.25316C20.6679 8.80551 20.0294 8.38986 19.3707 8.00787L19.3609 8.00241L19.3467 7.99453L15.9187 9.15894L15.9237 9.16044C16.0647 9.19471 16.2049 9.23358 16.3441 9.27705C17.0478 9.49692 17.7069 9.82894 18.2975 10.2568Z"
                fill="url(#paint5_linear_505_5)"
            />
        </g>
        <defs>
            <linearGradient
                id="paint0_linear_505_5"
                x1="4.01408"
                y1="10.416"
                x2="17.3345"
                y2="19.4689"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="currentColor" stop-opacity="0.8" />
                <stop offset="0.08" stop-color="currentColor" stop-opacity="0.84" />
                <stop offset="0.39" stop-color="currentColor" stop-opacity="0.95" />
                <stop offset="0.56" stop-color="currentColor" />
                <stop offset="0.65" stop-color="currentColor" stop-opacity="0.98" />
                <stop offset="0.76" stop-color="currentColor" stop-opacity="0.92" />
                <stop offset="0.88" stop-color="currentColor" stop-opacity="0.82" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0.7" />
            </linearGradient>
            <linearGradient
                id="paint1_linear_505_5"
                x1="0"
                y1="19.5216"
                x2="17.3768"
                y2="19.5216"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="currentColor" stop-opacity="0.9" />
                <stop offset="0.06" stop-color="currentColor" stop-opacity="0.91" />
                <stop offset="0.5" stop-color="currentColor" stop-opacity="0.95" />
                <stop offset="0.69" stop-color="currentColor" stop-opacity="0.91" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0.8" />
            </linearGradient>
            <linearGradient
                id="paint2_linear_505_5"
                x1="0"
                y1="19.5216"
                x2="17.3768"
                y2="19.5216"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="currentColor" stop-opacity="0.9" />
                <stop offset="0.06" stop-color="currentColor" stop-opacity="0.91" />
                <stop offset="0.5" stop-color="currentColor" stop-opacity="0.95" />
                <stop offset="0.69" stop-color="currentColor" stop-opacity="0.91" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0.8" />
            </linearGradient>
            <linearGradient
                id="paint3_linear_505_5"
                x1="4.75349"
                y1="3.79243"
                x2="23.9683"
                y2="5.13398"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="currentColor" stop-opacity="0.9" />
                <stop offset="0.07" stop-color="currentColor" stop-opacity="0.92" />
                <stop offset="0.28" stop-color="currentColor" stop-opacity="0.98" />
                <stop offset="0.47" stop-color="currentColor" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0.9" />
            </linearGradient>
            <linearGradient
                id="paint4_linear_505_5"
                x1="4.48909"
                y1="7.79626"
                x2="21.7285"
                y2="9.00048"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="currentColor" stop-opacity="0.9" />
                <stop offset="0.07" stop-color="currentColor" stop-opacity="0.92" />
                <stop offset="0.28" stop-color="currentColor" stop-opacity="0.98" />
                <stop offset="0.47" stop-color="currentColor" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0.9" />
            </linearGradient>
            <linearGradient
                id="paint5_linear_505_5"
                x1="4.48909"
                y1="7.79626"
                x2="21.7285"
                y2="9.00048"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="currentColor" stop-opacity="0.9" />
                <stop offset="0.07" stop-color="currentColor" stop-opacity="0.92" />
                <stop offset="0.28" stop-color="currentColor" stop-opacity="0.98" />
                <stop offset="0.47" stop-color="currentColor" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0.9" />
            </linearGradient>
        </defs>
    </svg>
)

const embedIconComponents = {
    ArrowLeft,
    ArrowRight,
    CarretRight,
    Eye,
    EyeSlash,
    Refresh,
    Select,
    Options,
    Close,
    Triangle,
    Signal,
    Root,
    Memo,
    Effect,
    RenderEffect,
    Computation,
    Context,
    Code,
    Search,
    Graph,
} as const

const iconComponents = {
    SolidWhite,
} as const

export const Icon: {
    [key in keyof typeof embedIconComponents | keyof typeof iconComponents]: IconComponent
} = {} as any

for (const name in embedIconComponents) {
    ;(Icon as any)[name] = (props: {class?: string}) => (
        <svg class={props.class}>
            <use href={`#sdt_icon_${name.toString()}`} />
        </svg>
    )
}

for (const name in iconComponents) {
    ;(Icon as any)[name] = iconComponents[name as keyof typeof iconComponents]
}

export default Icon

export const MountIcons: Component = () => {
    return (
        <div style="display:none">
            {(Object.keys(embedIconComponents) as (keyof typeof embedIconComponents)[]).map(
                name => {
                    const IconComp = embedIconComponents[name] as ProxyIconComponent<any>
                    return <IconComp id={name} />
                },
            )}
        </div>
    )
}
