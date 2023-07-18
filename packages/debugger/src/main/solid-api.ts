if (!globalThis.SolidDevtools$$) {
    throw new Error(
        `[solid-devtools]: Debugger hasn't found the exposed Solid Devtools API. Did you import the setup script?`,
    )
}

const SolidApi = globalThis.SolidDevtools$$

export default SolidApi
