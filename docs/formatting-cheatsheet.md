# Archive formatting cheat sheet

Copy this file into your Obsidian vault as a note if you want a reminder on the site itself. Everything below is written in normal Obsidian. No code.

## Photos

Write the image embed with one word after the pipe. The word picks the effect.

| You type | You get |
|---|---|
| `![[photo.jpg]]` | the photo exactly as uploaded |
| `![[photo.jpg\|halftone]]` | black and white dots |
| `![[photo.jpg\|phosphor]]` | green screen dots with scanlines |
| `![[photo.jpg\|cyber]]` | cyan dots on cobalt blue |
| `![[photo.jpg\|pixel]]` | chunky colour pixels |
| `![[photo.jpg\|code]]` | the picture rebuilt from hex, binary and symbols, with link lines |

Visitors can click any effect photo to see the original.

## Text

| You type | You get |
|---|---|
| `==a phrase==` | glowing highlight |
| `[[Another note]]` | a bracketed link that glitches on hover |
| `[^1]` and `[^1]: the note` | a footnote, shown as marginalia beside the paragraph |
| `> [!note] A title` then an indented line | a dialog box. Any callout type works |

## Homepage

- Add the tag `featured` to a note to list it under "featured writing".
- Add a `description` property to a note to show a one-line excerpt in lists.
- The scrolling line can be changed in the plugin settings (see `docs/ARCHIVE.md`).

## Music

- Link to an `.mp3`, `.m4a`, `.ogg` or `.wav` file in a note and a player appears in the bar at the bottom of the page.
- Bandcamp, SoundCloud, Spotify and YouTube embeds (an `<iframe>` pasted into the note) get a framed player look.
- Music starts only when a visitor presses play.
- Keep audio files small. Large files count against free hosting limits.

## Play (callouts that become little objects)

Write a callout with one of these names. Each line inside is plain text. A photo embed inside is used as the picture.

| You type | You get |
|---|---|
| `> [!idcard] Your Name` then `status: STILL HERE`, `type: human`, `color: #ff66cc`, `note: any text` | your own ID card with a photo, a barcode made from your name, and any lines you add. `color` and `signal` are optional |
| `> [!fibonacci] 12` | a golden spiral of 12 squares, labelled, with the sequence and the ratio underneath |
| `> [!fibpoem] Title` then one line per row | a poem whose lines are counted; a line turns green when its word count is a Fibonacci number (1, 1, 2, 3, 5, 8, 13) |
| `> [!polaroid] Caption` then a photo | a tilted instant photo |
| `> [!redacted] file 7` then lines of text | black bars over the words. Click to reveal |
| `> [!oracle] Ask me` then one answer per line | a button that draws a random line and types it out |
| `> [!progress] memory` then `70` | `[#######---] 70%` |
| `> [!countdown] Christmas` then `2026-12-25` | a live count of days, hours and seconds |
| `> [!terminal] boot` then lines | green text typed out as the reader scrolls to it |

If a name is misspelled, the callout simply shows as a normal box.

## Sacred geometry, topology and polymath tools

Same idea: a callout with one of these names. Numbers go in the title or the first line.

| You type | You get |
|---|---|
| `> [!flower] 3` | the Flower of Life, 1 to 6 rings |
| `> [!phyllotaxis] 900` | a sunflower spiral of seeds placed by the golden angle |
| `> [!mandala] any words` | a mandala grown from the words; the same words always grow the same mandala |
| `> [!ulam] 45` | the Ulam spiral: numbers wound into a square, primes lit |
| `> [!pascal] 16` | Pascal's triangle. Add a line `mod 2` for the Sierpinski triangle |
| `> [!collatz] 27` | the hailstone path of a number, with its steps and peak |
| `> [!mobius]` | a slowly turning Mobius band |
| `> [!knot] 3,2` | a turning torus knot. 3,2 is the trefoil |
| `> [!graph] Title` then lines like `A - B` | a drawn network, and whether you can walk every edge exactly once |
| `> [!number] 144` | facts: factors, perfect or abundant, Fibonacci, binary, hex, roman numeral |
| `> [!gematria] Title` then lines of words | letter values added up and reduced to one digit |
| `> [!timeline] Title` then lines like `1666: the plague year` | a sorted vertical timeline, negative years for BC |

Maths in notes already works too: write `$e^{i\pi} + 1 = 0$` for a formula.
