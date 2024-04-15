#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync } from "node:fs";
import { convertToASS } from "./ass";

function fadeToDialogueScript(fade: string) {
	let [fade_in, fade_out] = fade.split(",").map(x=>parseInt(x));
	if(fade_out === undefined) fade_out=fade_in;
	if(fade_in == 0 && fade_out == 0) {
		return "";
	} else {
		return `\\fad(${fade_in},${fade_out})`;
	}
}

function displayremoveToDisplayRemove(displayremove: string) {
	let [display, remove] = displayremove.split(",").map(x=>parseInt(x));
	if(remove === undefined) remove=display;
	return [display, remove];
}

async function mainCLI() {

	// TODO: Possibly only read the file in if track_offset is needed
	let track_offset = 0;
	if ("APPDATA" in process.env ) {
		try {
			const settings = readFileSync(process.env.APPDATA + "/Karaoke Builder/data_studio.ini", "utf8");
			track_offset = parseFloat(settings.match(/^setoffset\s+(\S+)/m)[1]) / 100;
		} catch (error) {

		}

	}

	// Per yargs docs, use of terminalWidth() in typescript requires workaround
	// of assigning a variable name to the instance so it can be referenced
	const yargsInstance = yargs(hideBin(process.argv));

	let argv = yargsInstance
		.scriptName("kbp2ass")
		.parserConfiguration({
			"camel-case-expansion": false,
			"duplicate-arguments-array": false,
			"strip-aliased": true
		})
		// Unable to use .positional handling because yargs inexplicably treats "$0 foo bar" differently from "$0 -- foo bar"
		.usage(`$0 [options] [--] [infile [outfile]]
		        $0 [options] infile minimum-progression-duration [--] [outfile] 

		        Convert file from KBS project format (.kbp) to SubStation Alpha subtitle (.ass)

		        infile:  input file in .kbp format (stdin if not specified)
		        outfile: output file in .ass format (stdout if not specified)

		        For compatibility with older releases, minimum-progression-duration can be specified as a positional parameter instead of an option (if both are specified, the positional wins). If your output file name happens to be a number, use -- at some point before the second positional parameter to disable this functionality.

		        Disable any boolean option with --no-[option]`)
		// Used for compatibility with old syntax allowing minimum-progression-duration as a positional
		// .positional only includes items before --, so this is how to tell if the second argument is before -- or not
		.command("* [compat1] [compat2]", false, function(yargs) {
			yargs.positional("compat1", {
				type: "string"
			})
				.positional("compat2", {
					type: "string"
				});
		})
		// Despite the fact that the second argument to .command is false,
		// positionals on the "default" command are still shown unless explicitly hidden
		.hide("compat1")
		.hide("compat2")
		.options({
			"syllable-precision": {
				alias: "s",
				description: "Highlight syllables individually instead of combining lines into a single string. Disabling this is not recommended.",
				type: "boolean",
				default: true,
				// "nargs: 0" alone doesn't seem to be enough to stop a flag from consuming a parameter next to it
				requiresArg: false,
				nargs: 0
			},
			"minimum-progression-duration": {
				alias: ["m", "wipe-threshold"],
				description: "Set threshold of syllable display time in milliseconds before using progressive wipe effect (implicit default 1000)",
				type: "number",
				requiresArg: true
			},
			"full-mode": {
				alias: "f",
				description: 'Enable processing of all positional and style information in the KBS project file (-w, -p, -b, -c, -t, -D -1). To unset any particular options use --no-{option}. For example, to run in full mode but with no border set, use "-f --no-b" or "--full-mode --no-border".',
				type: "boolean",
				requiresArg: false,
				nargs: 0
			},
			"cdg": {
				alias: "c",
				description: "Set the virtual resolution of the destination file to that of CDG graphics, enabling positioning, alignment, and font size to work as they do in KBS.",
				type: "boolean",
				requiresArg: false,
				nargs: 0
			},
			"wipe": {
				alias: "w",
				description: "Use wipe setting from project file (progressive wipe effect unless wiping is set to word by word). Sets -m to 0 if not otherwise set.",
				type: "boolean",
				requiresArg: false,
				nargs: 0
			},
			"position": {
				alias: "p",
				description: "Use position data from project file. This includes alignment as well as vertical/horizontal offset. Strongly recommended to use with -c option.",
				type: "boolean",
				requiresArg: false,
				nargs: 0
			},
			"border": {
				alias: "b",
				description: "Use default CDG border (12 pixels from top of screen). If -c option is used, these are virtual pixels. To use a custom border, set --no-border and add a border in your video editor of choice.",
				type: "boolean",
				requiresArg: false,
				nargs: 0
			},
			"fade": {
				alias: "F",
				description: "Fade-in/out duration for line display in milliseconds. Defaults to 300,200. If only one number is specified it is used for both fade in and out. If 0 or 0,0 is specified, fade effect is disabled entirely.",
				type: "string",
				requiresArg: true,
				nargs: 1
			},
			"displayremove": {
				alias: "D",
				description: "Timing for line display/remove in milliseconds. Defaults to 1000,100. Note that this time includes the fade, so e.g. fade in of 300 and display of 1000 means that the line fades in for 300ms, then continues displaying at full opacity for 700ms before wiping starts. If only one number is specified it is used for both display and remove. If -1 is specified for either parameter, display/remove timings from the .kbp are used.",
				type: "string",
				requiresArg: true,
				nargs: 1
			},
			"width": {
				alias: "W",
				description: "Override the width in the virtual resolution. E.g. set to 384 to get 16:9 aspect ratio if border is enabled, and 341 if it's not. This only has any effect with the --cdg option enabled.",
				type: "number",
				requiresArg: true,
				nargs: 1
			},
			"transparency": {
				alias: "t",
				description: "When using palette color 0, always treat it as transparent. This more closely models the behavior KBS uses when generating a CDG, because drawing in the background color XORs with 0, thus not updating the screen. This setting will only be noticeable if you overlap text or render the .ass against a different background color than is defined in the kbp file (or overlay an image/video).",
				type: "boolean",
				requiresArg: false,
				nargs: 0
			},
			"offset": {
				alias: "o",
				description: "Amount of seconds to adjust the timings in the .ass file. This can be used to match the offset configured in the KBS Studio Settings or to add time for an intro video. A negative number means to adjust the timings to occur before the time specified in the .kbp file. If not specified, the program will attempt to read from the KBS configuration file in %AppData%\\Karaoke Builder\\data_studio.ini. If unable, it will be set to 0. Note that the default setting in KBS is -0.2 seconds, but it is recommended to set it to 0 to make the .kbp files contain the true timing. If this offset would make any display/remove or wipe timings negative, those become 0.",
				type: "number",
				requiresArg: true
			}
		})
		.strictOptions()
		.check(function (argv) {
			let err=false;
			let f = argv["fade"]?.split(",");
			let d = argv["displayremove"]?.split(",");
			// Setting the type only makes it parse it as a number, it doesn't validate the result
			if(isNaN(argv["minimum-progression-duration"])) {
				throw new Error("--minimum-progression-duration must be a number");
				err=true;
			}
			if("width" in argv && (isNaN(argv["width"]) || ! Number.isInteger(argv["width"]) || argv["width"] < 1)) {
				throw new Error("--width must be a positive integer");
				err=true;
			}
			if (argv._.length > 2) {
				throw new Error("Maximum of 2 files may be specified (infile and outfile)");
				err=true;
			}
			if (f.length < 1 || f.length > 2 || f.some(x=>isNaN(parseInt(x)) || parseInt(x) < 0)){
				throw new Error("--fade must have 1-2 non-negative integer fade durations specified");
				err=true;
			}
			if (d.length < 1 || d.length > 2 || d.some(x=>isNaN(parseInt(x)) || parseInt(x) < -1)){
				throw new Error("--displayremove must have 1-2 non-negative or -1 integer display durations specified");
				err=true;
			}
			return !err;
		})
		.middleware(function (argv) {
			if (argv["full-mode"]) {
				argv = {
					wipe: true,
					position: true,
					border: true,
					cdg: true,
					transparency: true,
					displayremove: "-1",
					...argv
				};
			}
			if (argv.wipe) {
				argv = {
					"minimum-progression-duration": 0,
					...argv
				};
			}
			if ("compat2" in argv) {
				if (isNaN(parseInt(argv.compat2))) {
					argv._.unshift(argv.compat2);
				} else {
					argv["minimum-progression-duration"] = parseInt(argv.compat2);
				}
				delete argv.compat2;
			}
			if ("compat1" in argv) {
				argv._.unshift(argv.compat1);
				delete argv.compat1;
			}
			// "default" functionality from yargs cannot be used because it doesn't show whether a user set the value or the default set it
			const default_opts = ["wipe", "position", "border", "cdg", "full-mode", "transparency"];
			for(let x in default_opts) {
				const opt = default_opts[x];
				if (! (opt in argv)) argv[opt]=false;
			}
			if (! ("minimum-progression-duration" in argv)) {
				argv["minimum-progression-duration"]=1000;
			} 
			if (! ("fade" in argv)) {
				argv["fade"]="300,200";
			} 
			if (! ("displayremove" in argv)) {
				argv["displayremove"]="1000,100";
			} 
			if (! ("offset" in argv)) {
				argv["offset"]= track_offset || 0;
			}
			return argv;
		}, true)
		.wrap(yargsInstance.terminalWidth())
		.argv;

	let infile = argv._.shift() || "-";
	// const outfile = argv._.shift() || "-";

	delete argv._;
	delete argv["$0"];

	argv.dialogueScript = fadeToDialogueScript(argv.fade);
	delete argv.fade;

	[argv.display, argv.remove] = displayremoveToDisplayRemove(argv.displayremove);
	delete argv.displayremove;

    // Remap keys to be more javascript-friendly
    argv = (({"syllable-precision": syllablePrecision, "minimum-progression-duration": minimumProgressionDuration, ...rest}) =>
        ({syllablePrecision, minimumProgressionDuration, ...rest}))(argv)

	// This should be updated to work on Windows, but it would involve some extra
	// work because even though readFile can take a file descriptor, it doesn't seem
	// to work as expected with process.stdin.fd
	if (infile == "-") infile = "/dev/stdin";

	const txt = readFileSync(infile, "utf8");

	return convertToASS(txt, argv);
}

if (require.main === module) mainCLI()
	.then(data => console.log(data))
	.catch(err => console.error(err));
