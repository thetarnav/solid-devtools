let notified = false
function notify() {
  if (notified) return
  notified = true
  postMessage('__SolidOnPage__', '*')
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
