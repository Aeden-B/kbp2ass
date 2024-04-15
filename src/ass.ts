import { clone, msToAss } from "./utils";
import KBPParser from "./kbp";
import stringify from "./assStringify";
import type {
	IStyle,
	IConfig,
	ISentence,
	ISyllable,
	IDialogueKV,
	IStyleKV,
	IEvents,
} from "./types";
import * as ass from "./assTemplate";

function generateASSLine(line: ISentence, options: IConfig) {
	const assLine = [];
	let startMs = line.start;
	const stopMs = line.end;
	let display = options.display ?? 1000;
	let remove = options.remove ?? 100;
	let firstStart = null;
	let lastSylEnd = null;
	let gap = null;
	if(line.syllables) {
		line.syllables.forEach(syl => {
			gap =
				lastSylEnd != null && syl.start - lastSylEnd > 10
					? `{\\k${(syl.start - lastSylEnd) / 10}}`
					: "";
			assLine.push(
				`${gap}{\\k${getProgressive(syl, options)}${Math.floor(
					syl.duration / 10
				)}}${escapeAss(syl.text, firstStart == null)}`
			);

			if (firstStart == null) firstStart = syl.start;
			lastSylEnd = syl.end;
		});
	} else {
		assLine.push(escapeAss(line.text, true));
		firstStart=line.end; // Emulate "fixed text" and use the text style rather than the wipe style
	}
	const dialogue = clone(ass.defaultDialogue);

	// Comment starts exactly with syllables to allow for retiming
	dialogue.value.Start = msToAss(firstStart);
	dialogue.value.End = msToAss(remove == -1 ? stopMs : lastSylEnd + remove);
	dialogue.value.Style = line.styleName;

	const comment: IDialogueKV<"Comment"> = {
		key: "Comment",
		value: { ...dialogue.value, Text: assLine.join(""), Effect: "karaoke" },
	};

	// Reset start time to actual display for the dialogue lines
	if(display != -1) startMs = firstStart - display;
	dialogue.value.Start = msToAss(startMs);

	// Horizontal offset only makes sense when there is a set number of pixels to center across
	// TODO: position = true, cdg = false, line.alignment = 0 (pull from style), style.alignment != 8 - style object currently not included in parameters
	const hOffset = options.cdg || [0,8].includes(line.alignment) ? line.hpos : 0;
	const pos = options.position ? `\\pos(${hOffset},${line.vpos})` : "";
	// TODO: calculate rotation origin if not left-aligned to match KBS?
	const rot = options.position && line.rotation != 0 ? `\\frz${line.rotation}` : "";

	// TODO: only use \anX when it differs from style? Currently line only stores style name, and style detail is not passed in.
	dialogue.value.Text = `{${line.alignment == 0 ? "" : `\\an${line.alignment}`}${pos}${rot}\\k${
		(firstStart - startMs) / 10
	}${options.dialogueScript}}${assLine.join("")}`;
	dialogue.value.Effect = "fx";

	return {
		dialogue,
		comment,
	};
}

// Technically this should be two separate functions because {~} is a KBSism
// and escaping of {} and handling of literal \n, \N, \h are .ass things, but
// it was simpler just to make one.
function escapeAss(text: string, first: boolean = false) {
	// Literal / is encoded in .kbp as {~} since / is the end of syllable character
	// {} must be escaped to avoid it being interpreted as a tag
	// 0x200B is a zero-width space. There is nothing like \\ to insert a
	//   literal \, so this is the best we can do to get a literal \n, \h, \N
	text = text.replace(/{~}/g, "/")
		.replace(/[{}]/g, "\\$&")
		.replace(/\\([nhN])/g, `\\${String.fromCharCode(0x200B)}$1`);
	if(first) {
		text = text.replace(/^ /, "\\h");
	}
	return text;
}

function getProgressive(syl: ISyllable, options: IConfig) {
	// When duration exceeds the threshold, progressive wiping may be possible
	if (
		Math.floor(syl.duration / 10) >
		Math.floor(options.minimumProgressionDuration / 10)
	) {
		// If option is set to use wiping setting from the kbp file, do so, otherwise set unconditionally
		return options.wipe && !syl.wipeProgressive ? "" : "f";
		// If duration does not exceed the threshold, progressive wiping cannot be
		// used, regardless of kbp setting
	} else {
		return "";
	}
}

function getStyleAss(style: IStyle): IStyleKV {
	return {
		key: "Style",
		value: {
			...ass.defaultStyle.value,
			...style,
		},
	};
}

/** Convert KBP data (txt) to ASS */
export function convertToASS(time: string, options: IConfig) {
	const kbp = new KBPParser(options);
	const kara = kbp.parse(time);
	const dialogues: IDialogueKV<"Dialogue">[] = [];
	const comments: IDialogueKV<"Comment">[] = [];

	const styles = clone(ass.styles);
	styles.body = styles.body.concat(
		kbp.styles.length > 0
			? kbp.styles.map(style => getStyleAss(style))
			: [{ ...ass.defaultStyle }]
	);

	if (! ("dialogueScript" in options)) {
		options.dialogueScript = ass.dialogueScript;
	}

	comments.push({
		key: "Comment",
		value: {
			...ass.defaultDialogue.value,
			Effect: ass.scriptFX,
			Text: ass.script,
		},
	});
	for (const line of kara.track) {
		const ASSLines = generateASSLine(line, options);
		comments.push(clone(ASSLines.comment));
		dialogues.push(clone(ASSLines.dialogue));
	}
	// Function seems to be unnecessary. And it removes functionality (implicit
	// layering based on line/page order)
	//comments.sort(sortStartTime);
	//dialogues.sort(sortStartTime);
	const events: IEvents = {
		section: "Events",
		body: [...ass.events.body, ...comments, ...dialogues],
	};

	const header = clone(ass.scriptInfo);
	if (options.cdg) {
		if (options.border) {
			header.body.push(
				{ key: "PlayResX", value: options.width ?? 300 },
				{ key: "PlayResY", value: 216 }
			);
		} else {
			header.body.push(
				{ key: "PlayResX", value: options.width ?? 288 },
				{ key: "PlayResY", value: 192 }
			);
		}
	}
	return stringify([header, styles, events]);
}
