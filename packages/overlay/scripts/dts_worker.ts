import path from 'path'
import ts from 'typescript'
import { parentPort } from 'worker_threads'
import { getTscOptions, emitDts } from './dts'

const entryFile = path.resolve(process.cwd(), `src/index.tsx`)

const options = getTscOptions(false)

let oldProgram: ts.Program | undefined
parentPort!.on('message', () => {
  oldProgram = emitDts(entryFile, options, oldProgram)
})
