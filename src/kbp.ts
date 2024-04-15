import { IStyle, IConfig, ISentence, ISyllable } from "./types";


export default class KBPParser {
	config: IConfig;
	track: ISentence[] | undefined;
	styles: IStyle[] = [];
	fixedStyles: IStyle[] = [];

	constructor(config: IConfig) {
		this.config = config;
		this.track = [];
	}

	// Convert a 3-hex-digit RGB color to an 8-digit ABGR (backwards RGBA)
	kbp2AssColor(palette: string[], index: number) {
		// If transparency mode is on, if the palette color used is the background
		// (always index 0 in kbp format), do not display (full transparency)
		const start = index == 0 && this.config.transparency? "&HFF" : "&H00";
		return start + palette[index].split("").reverse().map(function (hex) {
			return hex + hex;
		}).join("");
	}

	getAlignement(element: string) {
		let alignment = 8;
		if (element === "C") {
			alignment = 8;
		} else if (element === "L") {
			alignment = 7;
		} else if (element === "R") {
			alignment = 9;
		}
		return alignment;
	}

	/**
	 * Parse an KBP text file
	 * @param {string} file KBP text file content
	 */
	parse(file: string) {
		// Lyric match regex like ZA/						592/622/0
		let regex = /(.*)\/ *([0-9]+)\/([0-9]+)\/([0-9]+)/g;

		if (file.match(regex).length === 0) {
			throw ("Invalid KaraokeBuilder file");
		}

		// Let's parse the file line by line
		let lines = file.replace(/\r+/g, "").split("\n");

		let sentenceID = 1;			// Current sentence ID
		let trackID = 1;			// Current track ID
		let currentStart = null;	// Start of the current sentence (milliseconds)
		let currentEnd = null;		// End of the previous sentence (milliseconds)
		let syllables = [];			// Syllables list of the current sentence
		let colours = null;			// list of colours
		let currentStyle: IStyle = null;	// Current style

		// Below are defaults from KBS, they should get replaced by the Margins config line
		let leftMargin = 2;
		let rightMargin = 2;
		let topMargin = 7 + (this.config.border ? 12 : 0); // margin from KBS plus CDG top border
		let lineSpacing = 12 + 19; // the effective line spacing seems to add 19 pixels to the value set in KBS

		const totalWidth = this.config.width || (this.config.border ? 300 : 288);
		
		// not set until a page starts
		let currentPos = null;
		let currentOffset = null;
		let horizontalPos = null;
		let currentAlignment = null;
		let defaultWipeProgressive = null;
		let rotation = null;

		let offsetms = Math.floor(this.config.offset * 1000);

		// We split blocks by PAGEV2, and ignore the first one (it is header)
		let blockcount = 0;

		// Parse each line of the file until the end
		for (let i = 0; i < lines.length; i++) {
			// Delete the trailing spaces
			let line: string = lines[i].trimEnd();

			if (line == "PAGEV2") {
				blockcount++;
				currentPos = topMargin - lineSpacing; // line is read before the applicable syllables start, so it will add back lineSpacing
				continue;
			}

			if (line.match(/^'Margins/)?.length > 0) {
				i++;
				[leftMargin, rightMargin, topMargin, lineSpacing] = lines[i].trim().split(",").map(x => parseInt(x));
				topMargin += (this.config.border ? 12 : 0);
				// TODO: determine the correct value based on style 0 (style 1 in GUI)
				// 19 is correct for Arial 12 bold, Arial 13, and Arial 13 bold
				lineSpacing += 19;
			}

			if (line.match(/^'Other/)?.length > 0) {
				i++;
				defaultWipeProgressive = (lines[i].trim().split(",")[1] == "5" ? false : true);
			}

			if (line.match(/^'Palette Colours/)?.length > 0) {
				i++;
				colours = lines[i].trim().split(",");
				continue;
			}

			let matches = line.match(/Style([0-1][0-9])/);
			if (matches?.length > 0) {
				// Style numbers can be skipped and possibly don't even need to be sequential
				let index = parseInt(matches[1]);
				// first line of style
				let element = line.trimStart().split(",");
				let style: IStyle = {
					Name: `${element[0]}_${element[1]}`,
					PrimaryColour: this.kbp2AssColor(colours, parseInt(element[4])),
					SecondaryColour: this.kbp2AssColor(colours, parseInt(element[2])),
					OutlineColour: this.kbp2AssColor(colours, parseInt(element[3])),
					BackColour: this.kbp2AssColor(colours, parseInt(element[5]))
				};
				i++;
				// second line of style
				element = lines[i].trim().split(",");
				style.Fontname = element[0];

				// TODO: improve this based on font used
				// Font size in .kbp refers to the cap height, whereas in .ass it
				// refers to the line/body height. 1.4 seems to be close
				// for most normal fonts but ideally this should change to
				// something like this example in Cairo:
				// https://stackoverflow.com/questions/23252321/freetype-sizing-fonts-based-on-cap-height
				// Another option is adding a parameter for font scaling
				// Note: using toFixed to make a reasonable-looking number for the .ass file
				// even though something like 16.799999999999997 will technically work
				style.Fontsize = (parseInt(element[1]) * 1.4).toFixed(2);

				// element[2] is empty if no styles are applied, and contains
				// the letters B, I, S, U for each of bold, italic, strikethrough,
				// underline
				style.Bold = element[2].indexOf("B") === -1 ? 0 : -1;
				style.Italic = element[2].indexOf("I") === -1 ? 0 : -1;
				style.StrikeOut = element[2].indexOf("S") === -1 ? 0 : -1;
				style.Underline = element[2].indexOf("U") === -1 ? 0 : -1;
				style.Encoding = parseInt(element[3]);
				i++;
				// third line of style
				element = lines[i].trim().split(",");
				// 0-3 are left/right/top/bottom outline
				style.Outline = parseInt(element[0]);
				// 4-5 are right/down shadow
				style.Shadow = parseInt(element[4]);
				// 6 is wiping style (text, outline, both), unused
				style.AllCaps = element[7] === "U";
				this.styles[index] = style;
				continue;
			}


			// Ignore everything before the first block
			if (blockcount == 0) {
				continue;
			}

			// TODO: transitions?
			if (line.match(/[LCR]\/[A-Za-z]/g)?.length > 0) {
				let element = line.split("/");
				currentPos += lineSpacing;
				currentOffset = parseInt(element[5]);
				rotation = parseInt(element[6]);
				currentAlignment = this.getAlignement(element[0]);
				horizontalPos = (currentAlignment - 7) * totalWidth / 2 + parseInt(element[4]) +
					(8 - currentAlignment) * (
						(currentAlignment == 7 ? leftMargin : rightMargin) + 
							(this.config.border ? 6 : 0));
				if (element[2] !== "0" && element[3] !== "0") {
					// Fixed text (no visibl wiping)
					// Create styles on demand as used
					if (element[1].toLowerCase() == element[1]) {
						let fixedIndex = element[1].charCodeAt(0) - "a".charCodeAt(0);
						fixedIndex = this.styles[fixedIndex] === undefined ? 0 : fixedIndex;
						this.fixedStyles[fixedIndex] ??= {
							...(this.styles[fixedIndex]),
							Name: `${this.styles[fixedIndex].Name}_Fixed`,
							// Color should be the "pre-wipe" color
							PrimaryColour: this.styles[fixedIndex].SecondaryColour,
							Alignment: undefined
						};
						currentStyle = this.fixedStyles[fixedIndex];
					} else { // Regular style
						currentStyle = this.styles[element[1].charCodeAt(0) - "A".charCodeAt(0)] ?? this.styles[0];
					}
					// Push the alignment from the first use of the style into the style
					currentStyle.Alignment ||= currentAlignment;
				}
				currentStart = Math.floor(parseInt(element[2]) * 10) + offsetms;
				if (currentStart < 0) currentStart = 0;
				currentEnd = Math.floor(parseInt(element[3]) * 10) + offsetms;
				if (currentEnd < 0) currentEnd = 0;
				continue;
			}

			// Ignore block separators FX/F/ statements
			if (line.startsWith("--------") || line.startsWith("FX/") || line == "PAGEV2" || line == "MODS") {
				continue;
			}

			// Empty line is end of line
			if (line.replace(/\s*/g, "").length == 0) {
				if (syllables.length > 0) {
					// Create a new sentence
					let sentence = this.makeSentence(sentenceID, syllables, currentStart, currentEnd, currentStyle.Name, currentPos + currentOffset, horizontalPos, currentAlignment == currentStyle.Alignment ? 0 : currentAlignment, rotation);
					currentStart = null;
					currentEnd = null;

					// Add the sentence to the current track
					if (trackID == 1) {
						this.track.push(sentence);
					}

					// Increment the sentence ID, reset the current sentence syllables
					sentenceID++;
					syllables = [];
				}
				continue;
			}

			// Syllable line
			if (line.match(regex)?.length === 1) {

				var syllable: any = {};

				// Split of the regex result
				let matches = line.split("/");

				// Get the syllable text
				syllable.text = matches[0];

				// Add the start time of the syllable

				syllable.start = Math.floor(parseInt(matches[1].trim()) * 10 + offsetms);
				if (syllable.start < 0) syllable.start = 0;
				// Add the duration, end time
				syllable.end = Math.floor(parseInt(matches[2].trim()) * 10 + offsetms);
				if (syllable.end < 0) syllable.end = 0;
				syllable.duration = syllable.end - syllable.start;

				let wipeType = parseInt(matches[3].trim());
				if(wipeType == 0) {
					syllable.wipeProgressive = defaultWipeProgressive;
				} else {
					syllable.wipeProgressive = (wipeType >= 5 ? false : true);
				}

				if (currentStyle && currentStyle.AllCaps) {
					syllable.text = syllable.text.toUpperCase();
				}

				if (syllable.start !== 0 || syllable.end !== 0) {
					// Add the syllable
					syllables.push(syllable);
				}
			}
		}

		return {
			track: this.track
		};
	}

	/**
	 * Make a new sentence
	 * @param {number} id              ID of the sentence
	 * @param {ISyllable[]} syllables  Syllables list of the sentence
	 * @param {number} start           Start time of the sentence
	 * @param {number} end             End time of the sentence
	 * @param {number} vpos            Vertical position to draw sentence
	 * @param {number} hpos            Horizontal position to draw sentence
	 * @param {number} alignment       Text alignment of sentence
	 * @param {number} rotation        Rotation of the text in degrees
	 */
	private makeSentence(
		id: number,
		syllables: ISyllable[],
		start: number,
		end: number,
		styleName: string,
		vpos: number,
		hpos: number,
		alignment: number,
		rotation: number
	): ISentence {
		start = start ?? syllables[0].start;
		end = end ?? syllables[syllables.length - 1].end;
		const duration = end - start;
		return {
			id,
			start,
			end,
			duration,
			styleName,
			vpos,
			hpos,
			alignment,
			syllables,
			rotation
		};
	}
}
