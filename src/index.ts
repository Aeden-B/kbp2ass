#!/usr/bin/env node
import { asyncExists, asyncReadFile, clone, msToAss } from './utils';
import KBPParser from './kbp';
import stringify from 'ass-stringify';
import { StyleElement, SyllabesConfig } from './types';
import ass = require('./assTemplate');
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function generateASSLine(line: any, options: SyllabesConfig) {
	const ASSLine = [];
	let startMs = line.start;
	const stopMs = line.end + 100;
	line.syllables.forEach((syl: any) => ASSLine.push(
		(syl.text.startsWith(' ') && ASSLine.length > 0 ? ' ' : '')
		+ '{\\k'
		+ getProgressive(syl, options)
		+ Math.floor(syl.duration / 10)
		+ '}'
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

function getProgressive(syl: any, options: SyllabesConfig) {
	return Math.floor(syl.duration / 10) > Math.floor(options.minimum_progression_duration / 10) ? 'f' : '';
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
	styles.body = styles.body.concat(kbp.styles.length > 0 ? kbp.styles.map(style => getStyleAss(style)) :	[ass.defaultStyle]);
	const script = clone(ass.dialogue);
	script.value.Effect = ass.scriptFX;
	script.value.Text = ass.script;
	script.key = 'Comment';
	comments.push(script);
	for (const line of kara.track) {
		const ASSLines = generateASSLine(line, options);
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


	// Per yargs docs, use of terminalWidth() in typescript requires workaround
	// of assigning a variable name to the instance so it can be referenced
	const yargsInstance = yargs(hideBin(process.argv))

	const argv = yargsInstance
		.scriptName('kbp2ass')
		.parserConfiguration({
			'camel-case-expansion': false,
			'duplicate-arguments-array': false,
			'strip-aliased': true
		})
		// Unable to use .positional handling because yargs inexplicably treats "$0 foo bar" differently from "$0 -- foo bar"
		.usage(`$0 [options] [--] [infile [outfile]]
		        $0 [options] infile minimum-progression-duration [--] [outfile] 

		        Convert file from KBS project format (.kbp) to SubStation Alpha subtitle (.ass)

		        infile:	input file in .kbp format (stdin if not specified)
		        outfile: output file in .ass format (stdout if not specified)

		        For compatibility with older releases, minimum-progression-duration can be specified as a positional parameter instead of an option (if both are specified, the positional wins). If your output file name happens to be a number, use -- at some point before the second positional parameter to disable this functionality.

		        Disable any boolean option with --no-[option]`)
		// Used for compatibility with old syntax allowing minimum-progression-duration as a positional
		// .positional only includes items before --, so this is how to tell if the second argument is before -- or not
		.command('* [compat1] [compat2]', false, function(yargs) {
			yargs.positional('compat1', {})
			     .positional('compat2', {});
		})
		// Despite the fact that the second argument to .command is false,
		// positionals on the "default" command are still shown unless explicitly hidden
		.hide('compat1')
		.hide('compat2')
		.options({
			'syllable-precision': {
				alias: 's',
				description: 'Highlight syllables individually instead of combining lines into a single string. Disabling this is not recommended.',
				type: 'boolean',
				default: true,
				// "nargs: 0" alone doesn't seem to be enough to stop a flag from consuming a parameter next to it
				requiresArg: false,
				nargs: 0
			},
			'minimum-progression-duration': {
				alias: ['m', 'wipe-threshold'],
				description: 'Set threshold of syllable display time in milliseconds before using progressive wipe effect (implicit default 1000)',
				type: 'number',
				requiresArg: true
			}
		})
		.strictOptions()
		.check(function (argv) {
			// Setting the type only makes it parse it as a number, it doesn't validate the result
			if(isNaN(argv['minimum-progression-duration'])) {
				throw new Error('--minimum-progression-duration must be a number');
			}
			else if (argv._.length > 2) {
				throw new Error('Maximum of 2 files may be specified (infile and outfile)');
			} else {
				return true;
			}

		})
		.middleware(function (argv) {
			if (argv.compat1) {
				argv._.unshift(argv.compat1);
				delete argv.compat1;
			}
			if (argv.compat2) {
				if (isNaN(parseInt(argv.compat2))) {
					argv._.unshift(argv.compat1);
				} else {
					argv['minimum-progression-duration'] = argv.compat2;
				}
				delete argv.compat2;
			}
			if (! ('minimum-progression-duration' in argv)) {
				argv['minimum-progression-duration']=1000;
			} 
			return argv;
		}, true)
		.wrap(yargsInstance.terminalWidth())
		.argv;

	argv.infile = argv._.shift() || '-';
	argv.outfile = argv._.shift() || '-';

	// This should be updated to work on Windows, but it would involve some extra
	// work because even though readFile can take a file descriptor, it doesn't seem
	// to work as expected with process.stdin.fd
	if (argv.infile == '-') argv.infile = '/dev/stdin';

	const minimum_progression_duration = Math.floor(argv['minimum-progression-duration']);

	if(! await asyncExists(argv.infile)) throw `File ${argv.infile} does not exist`;
	const txt = await asyncReadFile(argv.infile, 'utf8');

	return convertToASS(txt, { syllable_precision: argv['syllable-precision'], minimum_progression_duration });
}

if (require.main === module) mainCLI()
	.then(data => console.log(data))
	.catch(err => console.error(err));
