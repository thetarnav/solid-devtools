export type HSL = [hue: number, saturation: number, lightness: number]

export function hsl_zero(): HSL {
	return new Int16Array(3) as any as HSL
}

export function hsl(hue: number, saturation: number, lightness: number): HSL {
	let c = hsl_zero()
	c[0] = hue
	c[1] = saturation
	c[2] = lightness
	return c
}

export function hsl_to_string(c: HSL): string {
	return `hsl(${c[0]} ${c[1]}% ${c[2]}%)`
}

export function hsl_to_hsla_string(c: HSL, alpha: number): string {
	return `hsl(${c[0]} ${c[1]}% ${c[2]}% / ${alpha})`
}

export function mix(a: HSL, b: HSL, ar: number, br: number): HSL {
	let sum = ar + br
	ar = ar/sum
	br = br/sum
	let ah = a[0], bh = b[0]
	if (Math.abs(ah - bh) > 180) {
		if (ah > bh) {
			bh += 360
		} else {
			ah += 360
		}
	}
	let c = hsl_zero()
	c[0] = (ah*ar + bh*br + 360) % 360
	c[1] = a[1]*ar + b[1]*br
	c[2] = a[2]*ar + b[2]*br
	return c
}

/** Represents a color in the RGB color space. */
export class RGB {
	/**
	 * Creates an instance of the RGB class.
	 *
	 * @param r - The red component of the RGB color.
	 * @param g - The green component of the RGB color.
	 * @param b - The blue component of the RGB color.
	 */
	constructor(
		public r: number,
		public g: number,
		public b: number,
	) {}

	/** Returns a string representation of the RGB color in the format "rgb(r g b)". */
	toString = rgb_to_string.bind(null, this)
}

/** Represents a color in the RGBA color space. Extends the RGB class and adds an alpha component. */
export class RGBA extends RGB {
    a: number
	/**
	 * Creates an instance of the RGBA class.
	 *
	 * @param r - The red component of the RGBA color.
	 * @param g - The green component of the RGBA color.
	 * @param b - The blue component of the RGBA color.
	 * @param a - The alpha component (opacity) of the RGBA color.
	 */
	constructor(
		r: number,
		g: number,
		b: number,
		a: number,
	) {
		void super(r, g, b)
        this.a = a
	}

	/** Returns a string representation of the RGBA color in the format "rgb(r g b / a)". */
	toString = rgba_to_string.bind(null, this)
}

/**
 * Converts an RGB color to a string representation.
 *
 * @param   rgb - The RGB color to be converted.
 * @returns     A string in the format "rgb(r g b)" representing the RGB color.
 */
export function rgb_to_string(rgb: RGB): string {
	return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`
}

/**
 * Converts an RGBA color to a string representation.
 *
 * @param   rgba - The RGBA color to be converted.
 * @returns      A string in the format "rgb(r g b / a)" representing the RGBA color.
 */
export function rgba_to_string(rgba: RGBA): string {
	return `rgb(${rgba.r} ${rgba.g} ${rgba.b} / ${rgba.a})`
}

/**
 * Converts an RGB color to an RGBA color with the specified alpha component.
 *
 * @param   rgb - The RGB color to be converted.
 * @param   a   - The alpha component (opacity) of the resulting RGBA color.
 * @returns     A new RGBA color with the same RGB components and the specified alpha.
 */
export function rgb_to_rgba(rgb: RGB, a: number): RGBA {
	return new RGBA(rgb.r, rgb.g, rgb.b, a)
}

/**
 * Converts an RGB color to a numeric representation (32-bit integer).
 *
 * @param   rgb - The RGB color to be converted.
 * @returns     A numeric value representing the RGB color.
 */
export function rgb_int(rgb: RGB): number {
	return (rgb.r << 16) | (rgb.g << 8) | rgb.b
}

/**
 * Converts a numeric representation (32-bit integer) to an RGB color.
 *
 * @param   value - The numeric value representing the RGB color.
 * @returns       A new RGB color with components extracted from the numeric value.
 */
export function rgb_int_to_rgb(value: number): RGB {
	return new RGB((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff)
}

/**
 * Converts an RGBA color to a numeric representation (32-bit integer).
 *
 * @param   rgba - The RGBA color to be converted.
 * @returns      A numeric value representing the RGBA color.
 */
export function rgba_int(rgba: RGBA): number {
	return (rgba.r << 24) | (rgba.g << 16) | (rgba.b << 8) | rgba.a
}

/**
 * Converts a numeric representation (32-bit integer) to an RGBA color.
 *
 * @param   value - The numeric value representing the RGBA color.
 * @returns       A new RGBA color with components extracted from the numeric value.
 */
export function rgba_int_to_rgba(value: number): RGBA {
	return new RGBA((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff)
}

/**
 * Converts an RGB color and an alpha component to a numeric representation (32-bit integer).
 *
 * @param   rgb - The RGB color to be converted.
 * @param   a   - The alpha component (opacity) of the resulting RGBA color.
 * @returns     A numeric value representing the RGBA color with the specified alpha.
 */
export function rgb_to_rgba_int(rgb: RGB, a: number): number {
	return (rgb_int(rgb) << 8) | a
}

/**
 * Converts an RGB color to a CSS-compatible string representation.
 *
 * @param   rgb - The RGB color to be converted.
 * @returns     A string in the format "r g b" representing the RGB color.
 */
export function rgb_value(rgb: RGB): string {
	return `${rgb.r} ${rgb.g} ${rgb.b}`
}

/**
 * Converts an RGB color to a hexadecimal string representation.
 *
 * @param   rgb - The RGB color to be converted.
 * @returns     A string in the format "#rrggbb" representing the RGB color in hexadecimal notation.
 */
export function rgb_to_hex(rgb: RGB): string {
	return "#" + rgb.r.toString(16) + rgb.g.toString(16) + rgb.b.toString(16)
}

/**
 * Converts an RGBA color to a hexadecimal string representation.
 *
 * @param   rgba - The RGBA color to be converted.
 * @returns      A string in the format "#rrggbbaa" representing the RGBA color in hexadecimal
 *   notation.
 */
export function rgba_to_hex(rgba: RGBA): string {
	return (
		"#" + rgba.r.toString(16) + rgba.g.toString(16) + rgba.b.toString(16) + rgba.a.toString(16)
	)
}

/**
 * Converts a hex color to an rgb color
 *
 * @example hex_to_rgb('#ff0000') // { r: 255, g: 0, b: 0 } hex_to_rgb('#f00') // { r: 255, g: 0, b: 0
 * }
 */
export function hex_to_rgb(hex: string): RGB {
	if (hex[0] === "#") hex = hex.slice(1)
	if (hex.length < 6) {
		const r = parseInt(hex[0]!, 16)
		const g = parseInt(hex[1]!, 16)
		const b = parseInt(hex[2]!, 16)
		return new RGB(r, g, b)
	}
	const r = parseInt(hex.slice(0, 2), 16)
	const g = parseInt(hex.slice(2, 4), 16)
	const b = parseInt(hex.slice(4, 6), 16)
	return new RGB(r, g, b)
}

/**
 * Converts a hex color to an rgba color
 *
 * @example hex_to_rgba('#ff0000') // { r: 255, g: 0, b: 0, a: 1 } hex_to_rgba('#ff000000') // { r: 255,
 * g: 0, b: 0, a: 0 } hex_to_rgba('#f00') // { r: 255, g: 0, b: 0, a: 1 } hex_to_rgba('#f000') // { r:
 * 255, g: 0, b: 0, a: 0 }
 */
export function hex_to_rgba(hex: string): RGBA {
	if (hex[0] === "#") hex = hex.slice(1)
	if (hex.length < 6) {
		const r = parseInt(hex[0]!, 16)
		const g = parseInt(hex[1]!, 16)
		const b = parseInt(hex[2]!, 16)
		const a = hex[3] ? parseInt(hex[3], 16) / 255 : 1
		return new RGBA(r, g, b, a)
	}
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)
	const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1
	return new RGBA(r, g, b, a)
}
