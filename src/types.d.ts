export interface SyllabesConfig {
	syllable_precision?: boolean;
	minimum_progression_duration?: number;
}

interface StyleElement {
	Name: string;
	PrimaryColour: string;
	SecondaryColour: string;
	OutlineColour: string;
	BackColour: string;
	Fontname?: string;
	Fontsize?: number;
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

