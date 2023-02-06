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
  syllable_precision: boolean,
  minimum_progression_duration: number

}
```

You might want to set `syllable_precision` to `true` to get syllable-timed karaoke instead of sentence-timed karaoke

`minimum_progression_duration` is a duration in milliseconds. 0 is everything is progressive syllabe.
1000 is one second. By default, 1000

### CLI

The CLI version has the following usage:

```sh
kbp2ass [options] [--] [infile [outfile]]
kbp2ass [options] infile minimum-progression-duration [--] [outfile]

Convert file from KBS project format (.kbp) to SubStation Alpha subtitle (.ass)

infile:	input file in .kbp format (stdin if not specified)
outfile: output file in .ass format (stdout if not specified)

For compatibility with older releases, minimum-progression-duration can be specified as a positional parameter instead of an option (if both are
specified, the positional wins). If your output file name happens to be a number, use -- at some point before the second positional parameter to
disable this functionality.

Disable any boolean option with --no-[option]

Options:
      --help                                            Show help
      --version                                         Show version number
  -s, --syllable-precision                              Highlight syllables individually instead of combining lines into a single string.
                                                        Disabling this is not recommended. (default: true)
  -m, --minimum-progression-duration, --wipe-threshold  Set threshold of syllable display time in milliseconds before using progressive wipe
                                                        effect (implicit default 1000)

```

stdin support is currently only available on \*nix platforms. outfile support is not yet implemented.

## Build

If you wish to build from source, use `npm run-script build` to get standard JS in the `dist` folder.

## Test

You can test code with the `kbp` file included in the test directory :

```sh
node dist/index.js test/test.kkp
```

## License

MIT
