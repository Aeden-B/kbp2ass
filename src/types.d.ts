export interface SyllabesConfig {
	offset?: number
	syllable_precision?: boolean
}

interface StyleElement {
	Name: string;
	PrimaryColour: string;
	SecondaryColour: string;
	OutlineColour: string;
	BackColour: string;
	Fontname?: string;
	Fontsize?: string;
	Bold?: number;
	Italic?: number;
	Underline?: number;
	StrikeOut?: number;
	Encoding?: number;
	Outline?: number;
	Shadow?: number;
	Alignment?: number;
}

export function convertToASS(time: string, options: SyllabesConfig): string

