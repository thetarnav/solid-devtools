import ts from 'typescript'

export function getTscOptions(): ts.CompilerOptions {
  const configFile = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')
  if (!configFile) throw Error('tsconfig.json not found')
  const { config } = ts.readConfigFile(configFile, ts.sys.readFile)
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd())

  return {
    ...options,
    declarationDir: 'dist',
    emitDeclarationOnly: true,
    noEmit: false,
    noEmitOnError: false,
    declaration: true,
    rootDir: 'src',
    // packages from paths are being inlined to the output
    paths: {},
  }
}

export function emitDts(entryFile: string, options: ts.CompilerOptions, oldProgram?: ts.Program) {
  const timestamp = Date.now()
  const program = ts.createProgram([entryFile], options, undefined, oldProgram)
  program.emit()
  console.log('TSC complete', Math.ceil(Date.now() - timestamp))
  return program
}
