import { StyleElement, SyllabesConfig } from './types';


export default class KBPParser {

	config: SyllabesConfig;
	track: any;
	styles: StyleElement[] = [];

	constructor(config: SyllabesConfig) {
		this.config = config;
		this.track = [];
	}

	getSixDigitHexColor(hexcolor: string) {
		// If a three-character hexcolor, make six-character
		if (hexcolor.length === 3) {
			hexcolor = hexcolor.split('').reverse().map(function (hex) {
				return hex + hex;
			}).join('');
		}
		return hexcolor;
	}

	getAlignement(element: string) {
		let alignment = 8;
		if (element === 'C') {
			alignment = 8;
		} else if (element === 'L') {
			alignment = 7;
		} else if (element === 'R') {
			alignment = 9;
		}
		return alignment;
	}

	/**
	 * Parse an KBP text file
	 * @param {string} file KBP text file content
	 */
	parse(file: string) {

		// Lyric match regex like ZA/            592/622/0
		let regex = /(.*)\/ *([0-9]+)\/([0-9]+)\/([0-9]+)/g;

		if (file.match(regex).length === 0) {
			throw ('Invalid KaraokeBuilder file');
		}

		// Let's parse the file line by line
		let lines = file.replace(/\r+/g, '').split('\n');

		let sentenceID = 1;			// Current sentence ID
		let trackID = 1;			// Current track ID
		let currentStart = null;	// Start of the current sentence (milliseconds)
		let currentEnd = null;		// End of the previous sentence (milliseconds)
		let syllables = [];			// Syllables list of the current sentence
		let colours = null;			// list of colours
		let currentStyle: string = null;	// Current style

		// We split blocks by PAGEV2, and ignore the first one (it is header)
		let blockcount = 0;

		// Parse each line of the file until the end
		for (let i = 0; i < lines.length; i++) {
			// Delete the trailing spaces
			let line: string = lines[i].trim();

			if (line == 'PAGEV2' && blockcount === 0) {
				blockcount++;
				continue;
			}

			if (line.match(/Palette Colours/g)?.length > 0) {
				i++;
				colours = lines[i].trim().split(',');
				continue;
			}

			if (line.match(/Style[0-1][0-9]/g)?.length > 0) {
				// first line of style
				let element = line.split(',');
				let style: StyleElement = {
					Name: element[1],
					PrimaryColour: `&H00${this.getSixDigitHexColor(colours[element[4]])}`,
					SecondaryColour: `&H00${this.getSixDigitHexColor(colours[element[2]])}`,
					OutlineColour: `&H00${this.getSixDigitHexColor(colours[element[3]])}`,
					BackColour: `&H00${this.getSixDigitHexColor(colours[element[5]])}`
				};
				i++;
				// second line of style
				element = lines[i].trim().split(',');
				style.Fontname = element[0];
				style.Fontsize = element[1];
				style.Bold = element[2] === 'B' ? -1 : 0;
				style.Italic = element[2] === 'I' ? -1 : 0;
				style.StrikeOut = element[2] === 'S' ? -1 : 0;
				style.Underline = element[2] === 'U' ? -1 : 0;
				style.Encoding = parseInt(element[3]);
				i++;
				// third line of style
				element = lines[i].trim().split(',');
				style.Outline = parseInt(element[0]);
				style.Shadow = parseInt(element[4]);
				this.styles.push(style);
				continue;
			}

			// Ignore everything before the first block
			if (blockcount == 0) {
				continue;
			}

			if (line.match(/C\/[A-Z]/g)?.length > 0) {
				let element = line.split('/');
				this.styles[element[1].charCodeAt(0) - 65].Alignment = this.getAlignement(element[0]);
				currentStyle = this.styles[element[1].charCodeAt(0) - 65].Name;
				continue;
			}

			// Ignore block separators FX/F/ statements
			if (line.startsWith('--------') || line.startsWith('FX/') || line == 'PAGEV2' || line == 'MODS') {
				continue;
			}

			// Empty line is end of line
			if (line.replace(/\s*/g, '').length == 0) {
				if (syllables.length > 0) {
					// Create a new sentence
					let sentence = this.makeSentence(sentenceID, syllables, currentStart, currentEnd, currentStyle);

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
				let matches = line.split('/');

				// Get the syllable text
				syllable.text = matches[0];

				// Add the start time of the syllable
				syllable.start = Math.floor(parseInt(matches[1].trim()) * 10);
				// Add the duration, end time
				syllable.duration = Math.floor((parseInt(matches[2]) - parseInt(matches[1])) * 10);
				syllable.end = Math.floor(parseInt(matches[2].trim()) * 10);

				if (syllables.length === 0) {
					currentStart = syllable.start;
				}
				currentEnd = syllable.end;

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
	 * @param {number} id          ID of the sentence
	 * @param {any[]}  syllables   Syllables list of the sentence
	 * @param {number} start       Start time of the sentence
	 * @param {number} end         End time of the sentence
	 */
	private makeSentence(id: number, syllables: any[], start: number, end: number, currentStyle: string) {
		var sentence: any = {
			id: id,
			start: syllables[0].start,
			end: syllables[syllables.length - 1].end,
			currentStyle: currentStyle
		};

		// Insert sentence syllables as objects or as a string
		if (this.config.syllable_precision) {
			sentence.syllables = syllables;
		} else {
			sentence.text = '';
			for (var j = 0; j < syllables.length; j++) {
				sentence.text += syllables[j].text;
			}
		}

		// Add the start of the sentence if it was present on the last "sentence end" line
		if (start != null) {
			sentence.start = start;
		}

		// Add the end of the sentence if any
		if (end != null) {
			sentence.end = end;
		}

		// Set the duration with start and end
		sentence.duration = sentence.end - sentence.start;

		return sentence;
	}
}