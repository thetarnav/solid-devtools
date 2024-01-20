// @ts-check

import path from 'path'
import ts from 'typescript'
import * as worker_threads from 'worker_threads'

const isDev = process.argv.includes('--watch')
const entryFile = path.resolve(process.cwd(), `src/index.tsx`)

const options = getTscOptions()

if (isDev) {
    /** @type {ts.Program | undefined} */
    let old_program
    worker_threads.parentPort?.on('message', () => {
        old_program = emitDts(entryFile, options, old_program)
    })
} else {
    emitDts(entryFile, options)
    process.exit()
}

/**
 * @returns {ts.CompilerOptions}
 */
export function getTscOptions() {
    const configFile = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')
    if (!configFile) throw Error('tsconfig.json not found')
    const {config} = ts.readConfigFile(configFile, ts.sys.readFile)
    const {options} = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd())

    return {
        ...options,
        declarationDir: 'dist/types',
        emitDeclarationOnly: true,
        noEmit: false,
        noEmitOnError: false,
        declaration: true,
        // packages from paths are being inlined to the output
        paths: {},
    }
}

/**
 * @param {string} entryFile
 * @param {ts.CompilerOptions} options
 * @param {ts.Program} [oldProgram]
 * @returns {ts.Program}
 */
export function emitDts(entryFile, options, oldProgram) {
    const timestamp = Date.now()
    const program = ts.createProgram([entryFile], options, undefined, oldProgram)
    program.emit()
    console.log(`DTS complete in ${Math.ceil(Date.now() - timestamp)}ms`)
    return program
}
