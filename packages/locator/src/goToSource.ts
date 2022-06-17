export type TargetIDE = "vscode" | "webstorm" | "atom" | "vscode-insiders"

export type ElementLocation = {
	filePath: string
	line: number
	column: number
}

export type SourceCodeData = ElementLocation & {
	projectPath: string
	element: HTMLElement
}

export type TargetURLFunction = (data: SourceCodeData) => string | false

const targetIDEMap: Record<TargetIDE, (data: SourceCodeData) => string> = {
	vscode: ({ projectPath, filePath, line, column }) =>
		`vscode://file/${projectPath}/${filePath}:${line}:${column}`,
	"vscode-insiders": ({ projectPath, filePath, line, column }) =>
		`vscode-insiders://file/${projectPath}/${filePath}:${line}:${column}`,
	atom: ({ projectPath, filePath, line, column }) =>
		`atom://core/open/file?filename=${projectPath}/${filePath}&line=${line}&column=${column}`,
	webstorm: ({ projectPath, filePath, line, column }) =>
		`webstorm://open?file=${projectPath}/${filePath}&line=${line}&column=${column}`,
}

function getTargetURL(target: TargetIDE | TargetURLFunction, data: SourceCodeData): string | false {
	if (typeof target === "function") return target(data)
	return targetIDEMap[target](data)
}

export function openCodeSource(target: TargetIDE | TargetURLFunction, data: SourceCodeData): void {
	const url = getTargetURL(target, data)
	if (typeof url === "string") window.open(url, "_blank")
}
