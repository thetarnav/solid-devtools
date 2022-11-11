import { postWindowMessage } from 'solid-devtools/bridge'

let notified = false
function notify() {
  if (notified) return
  notified = true
  postWindowMessage('SolidOnPage')
}

if (window.Solid$$ == true) {
  notify()
} else {
  Object.defineProperty(window, 'Solid$$', {
    set(v) {
      if (v === true) notify()
    },
  })
}
