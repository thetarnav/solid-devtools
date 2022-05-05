export const isBrowser = typeof navigator !== "undefined"
export const target: any = isBrowser ? window : typeof global !== "undefined" ? global : {}
export const isChrome = typeof target.chrome !== "undefined" && !!target.chrome.devtools
export const isFirefox = isBrowser && navigator.userAgent.indexOf("Firefox") > -1
export const isWindows = isBrowser && navigator.platform.indexOf("Win") === 0
export const isMac = isBrowser && navigator.platform === "MacIntel"
export const isLinux = isBrowser && navigator.platform.indexOf("Linux") === 0
export const keys = {
	ctrl: isMac ? "&#8984;" : "Ctrl",
	shift: "Shift",
	alt: isMac ? "&#8997;" : "Alt",
	del: "Del",
	enter: "Enter",
	esc: "Esc",
}
