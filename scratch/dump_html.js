const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\2ea711f7-66bd-478a-9d25-c0b1a7a2aac5\\.system_generated\\steps\\332\\content.md', 'utf8');

const targets = [
  { name: 'Sapphire nightfall whisper', search: 'Sapphire nightfall whisper' },
  { name: 'Neptune', search: 'Color scheme 34: Neptune' },
  { name: 'Arctic reflection', search: 'Color scheme 48: Arctic reflection' },
  { name: 'Slate', search: 'Color scheme 49: Slate' },
  { name: 'Vichy', search: 'Color scheme 9: Vichy' }
];

targets.forEach(t => {
  let pos = 0;
  console.log(`\n=== ${t.name} ===`);
  while (true) {
    pos = content.indexOf(t.search, pos);
    if (pos === -1) break;
    // Look ahead 2000 chars to find cdn.sanity.io
    const snippet = content.slice(pos, pos + 2500);
    const urlMatch = snippet.match(/https:\/\/cdn\.sanity\.io\/images\/599r6htc\/[^"]+\.png/);
    if (urlMatch) {
      console.log('Sanity Image URL:', urlMatch[0]);
      break;
    }
    pos += t.search.length;
  }
});
