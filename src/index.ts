#!/usr/bin/env node
import { asyncExists, asyncReadFile, clone, msToAss } from './utils';
import KBPParser from './kbp';
import stringify from 'ass-stringify';
import { StyleElement, SyllabesConfig } from './types';
import ass = require('./assTemplate');

function generateASSLine(line: any) {
	const ASSLine = [];
	let startMs = line.start;
	const stopMs = line.end + 100;
	line.syllables.forEach((syl: any) => ASSLine.push(
		(syl.text.startsWith(' ') && ASSLine.length > 0 ? ' ' : '')
		+ '{\\k' + Math.floor(syl.duration / 10) + '}'
		+ syl.text.trim()
		+ (syl.text.endsWith(' ') ? ' ' : '')
	));
	const dialogue = clone(ass.dialogue);
	const comment = clone(ass.dialogue);
	dialogue.value.Start = msToAss(startMs - 900 < 0 ? 0 : startMs - 900);
	comment.value.Start = msToAss(startMs);
	dialogue.value.End = msToAss(stopMs);
	comment.value.End = msToAss(stopMs);
	dialogue.value.Text = '{\\k' + (startMs - 900 < 0 ? (900 - startMs) / 10 : 100) + ass.dialogueScript + ASSLine.join('');
	dialogue.value.Effect = 'fx';
	dialogue.value.Style = line.currentStyle;
	comment.value.Text = ASSLine.join('');
	comment.value.Effect = 'karaoke';
	comment.key = 'Comment';
	comment.value.Style = line.currentStyle;
	return {
		dialogue,
		comment
	};
}

function sortStartTime(a: any, b: any) {
	if (a.value.Start < b.value.Start) return -1;
	if (a.value.Start > b.value.Start) return 1;
	return 0;
}

function getStyleAss(style: StyleElement) {
	return {
		key: 'Style',
		value: {
			'Name': 'Default',
			'Fontname': 'Arial',
			'Fontsize': '24',
			'PrimaryColour': '&H00FFFFFF',
			'SecondaryColour': '&H000088EF',
			'OutlineColour': '&H00000000',
			'BackColour': '&H00666666',
			'Bold': '-1',
			'Italic': '0',
			'Underline': '0',
			'StrikeOut': '0',
			'ScaleX': '100',
			'ScaleY': '100',
			'Spacing': '0',
			'Angle': '0',
			'BorderStyle': '1',
			'Outline': '1.5',
			'Shadow': '0',
			'Alignment': '8',
			'MarginL': '0',
			'MarginR': '0',
			'MarginV': '20',
			'Encoding': '1',
			...style
		}
	};
}

/** Convert KBP data (txt) to ASS */
export function convertToASS(time: string, options: SyllabesConfig): string {
	const kbp = new KBPParser(options);
	const kara = kbp.parse(time);
	const dialogues = [];
	const comments = [];

	const styles = clone(ass.styles);
	styles.body = styles.body.concat(kbp.styles.length > 0 ? kbp.styles.map(style => getStyleAss(style)) :  [ass.defaultStyle]);
	const script = clone(ass.dialogue);
	script.value.Effect = ass.scriptFX;
	script.value.Text = ass.script;
	script.key = 'Comment';
	comments.push(script);
	for (const line of kara.track) {
		const ASSLines = generateASSLine(line);
		comments.push(clone(ASSLines.comment));
		dialogues.push(clone(ASSLines.dialogue));
	}
	comments.sort(sortStartTime);
	dialogues.sort(sortStartTime);
	const events = clone(ass.events);
	events.body = events.body.concat(comments, dialogues);
	return stringify([ass.scriptInfo, styles, events]);
}

async function mainCLI() {
	if (!process.argv[2]) {
		throw `KBP2ass - Convert KBP karaoke to ASS file
		Usage: kbp2ass myfile.txt
		Output goes to stdout
		`;
	}
	const txtFile = process.argv[2];

	if (!await asyncExists(txtFile)) throw `File ${txtFile} does not exist`;
	const txt = await asyncReadFile(txtFile, 'utf8');
	return convertToASS(txt, { syllable_precision: true });
}

if (require.main === module) mainCLI()
	.then(data => console.log(data))
	.catch(err => console.log(err));
