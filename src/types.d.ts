export interface SyllabesConfig {
	offset?: number
	syllable_precision?: boolean
}
export function convertToASS(time: string, options: SyllabesConfig): string

