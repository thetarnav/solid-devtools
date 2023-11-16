declare module '*.css' {
    const exportString: string
    export default exportString
}

declare const process: {env: Record<string, string>}
