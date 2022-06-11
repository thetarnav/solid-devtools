const LOWERCASE_REGEX = /^[a-z0-9]+$/

const LOC_ATTR_REGEX =
	/^((?:[a-zA-Z]:\\\\)?(?:[^\\\\/:*?"<>|]+\\\\)*[^\\\\/:*?"<>|]+):([0-9]+):([0-9]+)$/

export const isLowercase = (s: string) => LOWERCASE_REGEX.test(s)

export const getLocationAttribute = (filePath: string, line: number, column: number): string =>
	filePath + ":" + line + ":" + column

export function getLocationFromAttribute(value: string): {
	path: string
	line: number
	column: number
} | null {
	const match = value.match(LOC_ATTR_REGEX)
	if (!match) return null
	const [, path, line, column] = match
	return {
		path,
		line: +line,
		column: +column,
	}
}

export function getFileExtension(filename: string): string {
	const index = filename.lastIndexOf(".")
	return index < 0 ? "" : filename.substring(index)
}
export function isFileJSX(filename: string): boolean {
	const ext = getFileExtension(filename)
	return ext === ".jsx" || ext === ".tsx"
}
