const fullOpacity = {opacity: 1} as const
const noOpacity = {opacity: 0} as const
const options = {duration: 300} as const

export const fadeIn = (el: Element, done: VoidFunction): void => {
    el.animate([noOpacity, fullOpacity], options).finished.then(done)
}
export const fadeOut = (el: Element, done: VoidFunction): void => {
    el.animate([fullOpacity, noOpacity], options).finished.then(done)
}
