/**
 * Icons taken from https://phosphoricons.com
 */

import { Component } from "solid-js"

export type IconProps = {
  color?: string
  bgColor?: string
  class?: string
}

export type IconComponent = Component<IconProps>

export const Memo: IconComponent = props => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class={props.class}>
    <path
      d="M10 27V19C10 18.7348 10.1054 18.4804 10.2929 18.2929C10.4804 18.1054 10.7348 18 11 18H21C21.2652 18 21.5196 18.1054 21.7071 18.2929C21.8946 18.4804 22 18.7348 22 19V27H26C26.2652 27 26.5196 26.8946 26.7071 26.7071C26.8946 26.5196 27 26.2652 27 26V11.4125C27.0005 11.2827 26.9753 11.154 26.926 11.0339C26.8766 10.9138 26.8041 10.8046 26.7125 10.7125L21.2875 5.28751C21.1955 5.19591 21.0862 5.12338 20.9661 5.07404C20.846 5.02471 20.7174 4.99955 20.5875 5.00001H6C5.73478 5.00001 5.48043 5.10536 5.29289 5.2929C5.10536 5.48044 5 5.73479 5 6.00001V26C5 26.2652 5.10536 26.5196 5.29289 26.7071C5.48043 26.8946 5.73478 27 6 27H10Z"
      opacity={props.bgColor ? undefined : "0.2"}
      fill={props.bgColor ?? "currentColor"}
    />
    <path
      d="M27 11.4125V26C27 26.2652 26.8946 26.5196 26.7071 26.7071C26.5196 26.8946 26.2652 27 26 27H6C5.73478 27 5.48043 26.8946 5.29289 26.7071C5.10536 26.5196 5 26.2652 5 26V6.00001C5 5.73479 5.10536 5.48044 5.29289 5.2929C5.48043 5.10536 5.73478 5.00001 6 5.00001H20.5875C20.7174 4.99955 20.846 5.02471 20.9661 5.07404C21.0862 5.12338 21.1955 5.19591 21.2875 5.28751L26.7125 10.7125C26.8041 10.8046 26.8766 10.9138 26.926 11.0339C26.9753 11.154 27.0005 11.2827 27 11.4125V11.4125Z"
      stroke={props.color ?? "currentColor"}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M10 27V19C10 18.7348 10.1054 18.4804 10.2929 18.2929C10.4804 18.1054 10.7348 18 11 18H21C21.2652 18 21.5196 18.1054 21.7071 18.2929C21.8946 18.4804 22 18.7348 22 19V27"
      stroke={props.color ?? "currentColor"}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M19 9H12"
      stroke={props.color ?? "currentColor"}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export const CarretRight: IconComponent = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class={props.class}>
    <g>
      <path
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M96 48l80 80-80 80"
      ></path>
    </g>
  </svg>
)

export const Select: IconComponent = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class={props.class}>
    <g>
      <circle
        cx="128"
        cy="128"
        r="32"
        opacity={props.bgColor ? undefined : "0.2"}
        fill={props.bgColor ?? "currentColor"}
      ></circle>
      <circle
        cx="128"
        cy="128"
        r="88"
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
      ></circle>
      <path
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M128 20v40"
      ></path>
      <path
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M20 128h40"
      ></path>
      <path
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M128 236v-40"
      ></path>
      <path
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M236 128h-40"
      ></path>
      <circle
        cx="128"
        cy="128"
        r="32"
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
      ></circle>
    </g>
  </svg>
)

export const Options: IconComponent = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class={props.class}>
    <g>
      <circle
        cx="128"
        cy="128"
        opacity={props.bgColor ? undefined : "0.2"}
        fill={props.bgColor ?? "currentColor"}
      ></circle>
      <circle
        cx="128"
        cy="48"
        opacity={props.bgColor ? undefined : "0.2"}
        fill={props.bgColor ?? "currentColor"}
      ></circle>
      <circle
        cx="128"
        cy="208"
        opacity={props.bgColor ? undefined : "0.2"}
        fill={props.bgColor ?? "currentColor"}
      ></circle>
      <circle
        cx="128"
        cy="128"
        r="24"
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-miterlimit="10"
        stroke-width="16"
      ></circle>
      <circle
        cx="128"
        cy="48"
        r="24"
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-miterlimit="10"
        stroke-width="16"
      ></circle>
      <circle
        cx="128"
        cy="208"
        r="24"
        fill="none"
        stroke={props.color ?? "currentColor"}
        stroke-miterlimit="10"
        stroke-width="16"
      ></circle>
    </g>
  </svg>
)

export const X: IconComponent = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class={props.class}>
    <g>
      <path
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M200 56L56 200"
      ></path>
      <path
        stroke={props.color ?? "currentColor"}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="16"
        d="M200 200L56 56"
      ></path>
    </g>
  </svg>
)
