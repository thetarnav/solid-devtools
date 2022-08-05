import { style } from "@vanilla-extract/css"
import { theme, spacing, color } from "@solid-devtools/ui/theme"

export const styles = {
  header: style({
    // padding: "1rem",
    padding: spacing[4],
    backgroundColor: color.gray[100],
  }),
}
