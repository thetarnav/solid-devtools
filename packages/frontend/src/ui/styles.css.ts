//
// Global Styles
//

import { globalStyle } from '@vanilla-extract/css'

globalStyle('.sr-only', {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
})

//
// * Transitions
//
globalStyle('.fade-enter, .fade-exit-to', {
  opacity: 0,
})
globalStyle('.fade-enter-active, .fade-exit-active', {
  transition: 'opacity .3s ease',
})
// globalStyle(".fade-enter-active", {
//   transitionDelay: ".1s",
// })

//
// * Checkbox
//

// TODO: style checkboxes
// globalStyle('input[type="checkbox"]', {
//   // appearance: "none",
// })
