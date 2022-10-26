import { SyllabesConfig } from './types';

export default class KBPParser {

	config: SyllabesConfig;
	track: any;

	constructor(config: SyllabesConfig) {
		this.config = config;
		this.track = [];
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

		// We split blocks by PAGEV2, and ignore the first one (it is header)
		let blockcount = 0;

		// Parse each line of the file until the end
		for (let i = 0; i < lines.length; i++) {
			// Delete the trailing spaces
			let line = lines[i].replace(/^\s*/, '');

			if (line == 'PAGEV2' && blockcount === 0) {
				blockcount++;
				continue;
			}
			// Ignore everything before the first block
			if (blockcount == 0) {
				continue;
			}

			// Ignore block separators and C/A, FX/F/ statements
			if (line.startsWith('--------') || line.startsWith('C/A/') || line.startsWith('FX/') || line == 'PAGEV2') {
            	continue;
			}

			// Empty line is end of line
			if (line.replace(/\s*/g, '').length == 0) {
				if (syllables.length > 0) {
					// Create a new sentence
					let sentence = this.makeSentence(sentenceID, syllables, currentStart, currentEnd);

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
			if (line.match(regex).length === 1) {

				var syllable: any = {};

				// Split of the regex result
				let matches = line.split('/');

				// Get the syllable text
				syllable.text = matches[0]

				// Add the start time of the syllable
				syllable.start = Math.floor(parseInt(matches[1].trim())*10);
				// Add the duration, end time
				syllable.duration = Math.floor((parseInt(matches[2])- parseInt(matches[1]))*10);
				syllable.end = Math.floor(parseInt(matches[2].trim())*10);

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
	private makeSentence(id: number, syllables: any[], start: number, end: number) {
		var sentence: any = {
			id: id,
			start: syllables[0].start,
			end: syllables[syllables.length - 1].end
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