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
