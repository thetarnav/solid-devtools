import fs from 'fs'
import path from 'path'
import { defineConfig } from 'tsup'
import * as preset from 'tsup-preset-solid'
import { CI } from '../../configs/tsup.config'

const src = path.resolve(__dirname, 'src')
const entries = fs.readdirSync(src)

export default defineConfig(config => {
    const watching = !!config.watch

    const parsed_options = preset.parsePresetOptions(
        {
            entries: entries.map(entry => ({ entry: path.join(src, entry) })),
        },
        watching,
    )

    if (!watching && !CI) {
        const package_fields = preset.generatePackageExports(parsed_options)

        /*
            will update ./package.json with the correct export fields
        */
        preset.writePackageJson(package_fields)
    }

    return preset.generateTsupOptions(parsed_options)
})
