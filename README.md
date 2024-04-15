# KBP2ASS

This is a converter for [Karaoke Builder Studio](https://www.karaokebuilder.com/kbstudio.php) karaoke format to ASS, written in nodeJS.

## History

These karaokes can now be converted to ASS easily and implemented in projects like [Karaoke Mugen](http://karaokes.moe)

## Installation

Run `npm install -g kbp2ass` to install as a global module (and get the CLI version)

Run `npm install kbp2ass` to install as a module for your project.

## Usage

### Module

As a module here's the method to use it :

#### convertToASS(txt: string, options: {object})

Returns a correctly formatted ASS file as a string. You need to provide the contents of the kbp TXT file as the first parameter and options as the second one.

Options are :

```JS
{
  'minimum-progression-duration': number,
  'cdg': boolean,
  'wipe': boolean,
  'position': boolean,
  'border': boolean,
  'width': number,
  'transparency': boolean,
  'dialogueScript': string, // Specify custom prefix used on all lines, e.g. custom fade in/out values
  'offset': number,
  'display': number,
  'remove': number
}
```

See details of these options from the matching options in the CLI section below. There's a comment on the dialogueScript option because its matching option is the non-obvious --fade, and it's more flexible. The fadeToDialogueScript function can be used to convert from the fade string format in the CLI.

### CLI

The CLI version has the following usage:

```sh
kbp2ass [options] [--] [infile [outfile]]
kbp2ass [options] infile minimum-progression-duration [--] [outfile]

Convert file from KBS project format (.kbp) to SubStation Alpha subtitle (.ass)

infile:  input file in .kbp format (stdin if not specified)
outfile: output file in .ass format (stdout if not specified)

For compatibility with older releases, minimum-progression-duration can be specified as a positional parameter instead of an option (if both are
specified, the positional wins). If your output file name happens to be a number, use -- at some point before the second positional parameter to
disable this functionality.

Disable any boolean option with --no-[option]

Options:
      --help                                            Show help                                                                        [boolean]
      --version                                         Show version number                                                              [boolean]
  -m, --minimum-progression-duration, --wipe-threshold  Set threshold of syllable display time in milliseconds before using progressive wipe
                                                        effect (implicit default 1000)                                                    [number]
  -f, --full-mode                                       Enable processing of all positional and style information in the KBS project file (-w, -p,
                                                        -b, -c, -t, -D -1). To unset any particular options use --no-{option}. For example, to run
                                                        in full mode but with no border set, use "-f --no-b" or "--full-mode --no-border".
                                                                                                                                         [boolean]
  -c, --cdg                                             Set the virtual resolution of the destination file to that of CDG graphics, enabling
                                                        positioning, alignment, and font size to work as they do in KBS.                 [boolean]
  -w, --wipe                                            Use wipe setting from project file (progressive wipe effect unless wiping is set to word
                                                        by word). Sets -m to 0 if not otherwise set.                                     [boolean]
  -p, --position                                        Use position data from project file. This includes alignment as well as
                                                        vertical/horizontal offset. Strongly recommended to use with -c option.          [boolean]
  -b, --border                                          Use default CDG border (12 pixels from top of screen). If -c option is used, these are
                                                        virtual pixels. To use a custom border, set --no-border and add a border in your video
                                                        editor of choice.                                                                [boolean]
  -F, --fade                                            Fade-in/out duration for line display in milliseconds. Defaults to 300,200. If only one
                                                        number is specified it is used for both fade in and out. If 0 or 0,0 is specified, fade
                                                        effect is disabled entirely.                                                      [string]
  -D, --displayremove                                   Timing for line display/remove in milliseconds. Defaults to 1000,100. Note that this time
                                                        includes the fade, so e.g. fade in of 300 and display of 1000 means that the line fades in
                                                        for 300ms, then continues displaying at full opacity for 700ms before wiping starts. If
                                                        only one number is specified it is used for both display and remove. If -1 is specified
                                                        for either parameter, display/remove timings from the .kbp are used.              [string]
  -W, --width                                           Override the width in the virtual resolution. E.g. set to 384 to get 16:9 aspect ratio if
                                                        border is enabled, and 341 if it's not. This only has any effect with the --cdg option
                                                        enabled.                                                                          [number]
  -t, --transparency                                    When using palette color 0, always treat it as transparent. This more closely models the
                                                        behavior KBS uses when generating a CDG, because drawing in the background color XORs with
                                                        0, thus not updating the screen. This setting will only be noticeable if you overlap text
                                                        or render the .ass against a different background color than is defined in the kbp file
                                                        (or overlay an image/video).                                                     [boolean]
  -o, --offset                                          Amount of seconds to adjust the timings in the .ass file. This can be used to match the
                                                        offset configured in the KBS Studio Settings or to add time for an intro video. A negative
                                                        number means to adjust the timings to occur before the time specified in the .kbp file. If
                                                        not specified, the program will attempt to read from the KBS configuration file in
                                                        %AppData%\Karaoke Builder\data_studio.ini. If unable, it will be set to 0. Note that the
                                                        default setting in KBS is -0.2 seconds, but it is recommended to set it to 0 to make the
                                                        .kbp files contain the true timing. If this offset would make any display/remove or wipe
                                                        timings negative, those become 0.                                                 [number]

```

stdin support is currently only available on \*nix platforms. outfile support is not yet implemented.

The recommended two usages are basic mode and full mode. Basic mode is:

`kbp2ass infile.kbp`

This creates an easy-to-edit .ass file with display/remove and wipe timing from the .kbp file.

Full mode is:

`kbp2ass -f infile.kbp`

This creates a .ass file with as many kbp features as possible (which will be extended further as development continues). The intention is not to distribute this directly, as it might cause problems for some video players and is difficult to edit/read. The goal is to have a format that can be immediately hard-subbed into a video. It should be compatible with ffmpeg and anything else that uses libass. Example hard-subbing command:

ffmpeg -i background-video.mp4 -vf ass=outfile.ass outfile.mp4

For the cleanest wiping, 60fps video is recommended.

## Build

If you wish to build from source, use `npm run-script build` to get standard JS in the `dist` folder.

## Test

You can test code with the `kbp` file included in the test directory :

```sh
node dist/index.js test/test.kkp
```

## License

MIT
