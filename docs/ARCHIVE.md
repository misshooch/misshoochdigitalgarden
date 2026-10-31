# Miss Hooch Archive: how it works

The redesign is one plugin, `src/plugins/misshooch-archive/`, plus two small changes in the core files. Nothing in your Obsidian workflow changes: frontmatter, permalinks, internal links and publishing all work as before.

## What was added

| File | What it does |
|---|---|
| `src/plugins/misshooch-archive/styles/archive.css` | Both skins, home page, callouts, status bar, photo frames |
| `src/plugins/misshooch-archive/assets/archive-r6.js` | Skin switch, photo effects, marginalia, music player |
| `src/plugins/misshooch-archive/templates/` | Homepage section, status bar, nav buttons, related notes |
| `src/site/a-z.njk` and `a-z.11tydata.js` | The alphabetical index at `/a-z/` |
| `src/helpers/azGroups.js` | Groups note titles by letter |
| `src/helpers/homeChoice.js` | Picks one homepage when several notes claim it |

## The homepage safeguard

`src/site/notes/notes.11tydata.js` now allows only one note to own `/`. If more than one note is marked as the home page (`dg-home`), the one with the most text wins, the others keep their own permalinks, and the build log prints a line starting `[home]`. Two notes can no longer fail the build by both writing `dist/index.html`.

## Switching it off

To go back to the old look without deleting anything, create `src/plugins/plugins.json` containing:

    { "plugins": { "misshooch-archive": { "enabled": false } } }

The A-Z page and the homepage safeguard stay.

## Settings

In `src/plugins/plugins.json` (or the plugin settings screen if your Obsidian plugin shows one):

    { "plugins": { "misshooch-archive": { "settings": {
        "marquee": "YOUR LINE HERE // ",
        "featuredTag": "featured"
    } } } }

## Not changed

`.env`, `vercel.json`, `package.json`, the theme setting, search, backlinks, link previews and the graph plugin. The graph is restyled through colour variables only, so its behaviour is untouched.

## Known limits

- The first real build is the first time the Eleventy parts run together. Check the Vercel preview before merging.
- `![[photo.jpg|halftone]]` relies on Obsidian passing the word through as the image's alt text. If an effect does not appear on a photo, check the page source for `alt="halftone"`.
- Photo effects run in the visitor's browser, so the original file is still downloaded.


## Added in v1.1
- Homepage ID card and portrait: set `idStatus` (and optionally `portrait`) in the plugin settings. Click the portrait to cycle photos.
- Boot lines under the homepage heading; press `/` anywhere to search.
- Music player: always in the bottom bar. Set `playlist` as `Title|url; Title|url`, or link an audio file in a note.
- `/photos/` page shows the photos in every effect.
- Dropdown boxes: write a callout with a minus, `> [!note]- Title`, and it folds.

## Photos and music (v1.2)
- Photos: any image in a vault folder called `Photos` (published through a note that embeds it) appears on `/photos/` in every effect, and the first one becomes the homepage portrait. Click the portrait to cycle through them. With none, the portrait and photos page stay empty. To use a fixed portrait instead, set the `portrait` plugin setting.
- Music: put audio files (mp3, m4a, ogg, wav) in `src/site/img/music/`. They join the player's playlist automatically, titled by file name. Links in the `playlist` setting (`Title|url; Title|url`) are added first.

## Playlist file (v1.3)
Edit `src/site/playlist.txt`, one song per line as `Title|https://link.mp3`. Lines starting with `#` are ignored. These join the `playlist` setting and any files in `src/site/img/music/`.

## Adding photos the easy way (v1.4)
- Same-site photos: upload to `src/site/img/photos/` on GitHub. Put the effect before the extension, e.g. `beach.halftone.jpg` (halftone, phosphor, cyber, pixel, code). No effect = shown in every effect.
- Hosted photos: add a line to `src/site/photos.txt`: `https://link.jpg | effect | caption`. The host needs a CORS rule allowing GET from `*` for effects to work.
- The first same-site photo becomes the homepage portrait.

## Photos page (v1.5)
`/photos/` shows one tile for every image Obsidian has uploaded (plus `src/site/img/photos/` and `src/site/photos.txt`). Each starts unaffected; click it to cycle through the effects.

## Play components (v1.6)
`assets/play-r2.js` and `styles/play.css` turn callouts named idcard, fibonacci, fibpoem, polaroid, redacted, oracle, progress, countdown and terminal into interactive blocks. See `docs/formatting-cheatsheet.md`.

## Geometry, topology and polymath tools (v1.7)
`assets/math-r1.js` and `styles/math.css`: flower, phyllotaxis, mandala, ulam, pascal, collatz, mobius, knot, graph, number, gematria and timeline callouts. See `docs/formatting-cheatsheet.md`.
