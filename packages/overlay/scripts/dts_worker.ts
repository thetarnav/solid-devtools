import path from 'path'
import { parentPort } from 'worker_threads'
import { getTscOptions, emitDts } from './dts'

const entryFile = path.resolve(process.cwd(), `src/index.tsx`)

const options = getTscOptions()

parentPort!.on('message', () => {
  emitDts(entryFile, options)
})
