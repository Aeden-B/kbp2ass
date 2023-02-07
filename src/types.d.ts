export interface ConverterConfig {
	'full-mode'?: boolean;
	'syllable-precision'?: boolean;
	'wipe'?: boolean;
	'position'?: boolean;
	'border'?: boolean;
	'cdg'?: boolean;
	'minimum-progression-duration'?: number;
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

export function convertToASS(time: string, options: ConverterConfig): string

