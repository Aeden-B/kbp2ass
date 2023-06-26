interface IConfig {
	'full-mode'?: boolean;
	'syllable-precision'?: boolean;
	'wipe'?: boolean;
	'position'?: boolean;
	'border'?: boolean;
	'cdg'?: boolean;
	'minimum-progression-duration'?: number;
  'dialogueScript'?: string;
	'transparency'?: boolean;
  'offset'?: number;
  }
  
  interface IStyle {
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
	ScaleX?: number;
	ScaleY?: number;
	Spacing?: number;
	Angle?: number;
	BorderStyle?: number;
	MarginL?: number;
	MarginR?: number;
	MarginV?: number;
  }
  interface IStyleKV {
	key: "Style";
	value: IStyle;
  }
  interface IStyles {
	section: string;
	body: Array<{ key: "Format"; value: Array<keyof IStyle> } | IStyleKV>;
  }
  interface IDialogue {
	Layer: string;
	Start: string;
	End: string;
	Style: string;
	Name: string;
	MarginL: string;
	MarginR: string;
	MarginV: string;
	Effect: string;
	Text: string;
  }
  interface IDialogueKV<T> {
	key: T;
	value: IDialogue;
  }
  interface IFormatKV {
	key: "Format";
	value: Array<keyof IDialogue>;
  }
  
  // ? same as sentence ?
  interface ISyllable {
	text: string;
	start: number;
	end: number;
	duration: number;
	wipeProgressive: boolean;
  }
  interface ISentence {
	id: number;
	syllables: ISyllable[];
	start: number;
	end: number;
	currentStyle: string;
	vpos: number;
	hpos: number;
	alignment: number;
	text: string;
	duration: number;
  }
  
  interface IScriptInfo {
	section: string;
	body: {
	  type?: string;
	  value: string | number;
	  key?: string;
	}[];
  }
  
  interface IEvents {
	section: "Events";
	body: Array<IFormatKV | IDialogueKV<"Dialogue"> | IDialogueKV<"Comment">>;
  }
  
  type TSection = IScriptInfo | IStyles | IEvents;
  
  export function convertToASS(time: string, options: IConfig): string;
  