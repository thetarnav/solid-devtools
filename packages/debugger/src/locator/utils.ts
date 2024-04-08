import {SourceLocation} from './types'

/**
 * Validates and parses a location string to a {@link SourceLocation} object
 */
export function parseLocationString(location: string): SourceLocation | undefined {
    // eslint-disable-next-line prefer-const
    let [filePath, line, column] = location.split(':') as [string, string | number, string | number]
    if (
        filePath &&
        line &&
        column &&
        typeof filePath === 'string' &&
        !isNaN((line = Number(line))) &&
        !isNaN((column = Number(column)))
    ) {
        return {file: filePath, line, column}
    }
}
