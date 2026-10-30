/**
 * Group notes by first letter for the A-Z index page. Titles starting with a
 * digit or symbol go under "#". Input order does not matter.
 *
 * @param {{title: string, url: string}[]} notes
 * @returns {{letter: string, notes: {title: string, url: string}[]}[]}
 */
function azGroups(notes) {
  const sorted = (notes || [])
    .filter((n) => n && n.title)
    .slice()
    .sort((a, b) =>
      String(a.title).localeCompare(String(b.title), undefined, { sensitivity: "base" })
    );
  const groups = [];
  for (const note of sorted) {
    const first = String(note.title).trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    let group = groups.find((g) => g.letter === letter);
    if (!group) {
      group = { letter, notes: [] };
      groups.push(group);
    }
    group.notes.push(note);
  }
  // "#" goes last, letters stay alphabetical
  return groups.sort((a, b) => {
    if (a.letter === "#") return 1;
    if (b.letter === "#") return -1;
    return a.letter.localeCompare(b.letter);
  });
}

module.exports = { azGroups };
