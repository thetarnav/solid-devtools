export type TargetIDE = "vscode" | "webstorm" | "atom" | "vscode-insiders"

export type TargetURLFunction = (path: string, line: number, column: number) => string

const targetIDEMap: Record<TargetIDE, TargetURLFunction> = {
	vscode: (path, line, column) => `vscode://file/${path}:${line}:${column}`,
	"vscode-insiders": (path, line, column) => `vscode-insiders://file/${path}:${line}:${column}`,
	atom: (path, line, column) =>
		`atom://core/open/file?filename=${path}&line=${line}&column=${column}`,
	webstorm: (path, line, column) => `webstorm://open?file=${path}&line=${line}&column=${column}`,
}

function getTargetURL(
	target: TargetIDE | TargetURLFunction,
	path: string,
	line: number,
	column: number,
): string {
	if (typeof target === "function") return target(path, line, column)
	return targetIDEMap[target](path, line, column)
}

export function openCodeSource(
	target: TargetIDE | TargetURLFunction,
	path: string,
	line: number,
	column: number,
): void {
	const url = getTargetURL(target, path, line, column)
	window.open(url, "_blank")
}
