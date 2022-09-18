import { ParentComponent, ComponentProps } from "solid-js"
// import { AriaToggleButtonProps, createToggleButton } from "@solid-aria/button"
import { combineProps } from "@solid-primitives/props"
import * as styles from "./button.css"

export const ToggleButton: ParentComponent<
  ComponentProps<"button"> & { onToggle: (selected: boolean) => void; selected: boolean }
> = props => {
  props = combineProps(props, {
    class: styles.toggleButton,
    get "aria-selected"() {
      return props.selected
    },
    onClick: () => props.onToggle(!props.selected),
  })

  // ! createToggleButton doesn't seems to passing class to buttonProps
  // let ref!: HTMLButtonElement
  // const { buttonProps } = createToggleButton(props, () => ref)

  return <button {...props} />
}
