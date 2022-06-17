import { WINDOW_PROJECTPATH_PROPERTY } from "@shared/variables"

export {}

declare global {
	interface Window {
		[WINDOW_PROJECTPATH_PROPERTY]: string
	}
}
