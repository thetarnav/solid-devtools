import path from 'path'
import ts from 'typescript'
import {parentPort} from 'worker_threads'
import {emitDts, getTscOptions} from './dts'

const isDev = process.argv.includes('--watch')
const entryFile = path.resolve(process.cwd(), `src/index.tsx`)

const options = getTscOptions()

if (isDev) {
    let oldProgram: ts.Program | undefined
    parentPort!.on('message', () => {
        oldProgram = emitDts(entryFile, options, oldProgram)
    })
} else {
    emitDts(entryFile, options)
    process.exit()
}
