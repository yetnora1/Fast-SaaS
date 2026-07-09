const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\2ea711f7-66bd-478a-9d25-c0b1a7a2aac5\\.system_generated\\steps\\332\\content.md', 'utf8');

const targets = [
  { name: 'Sapphire', keyword: 'Color scheme 23: Sapphire' },
  { name: 'Neptune', keyword: 'Color scheme 34: Neptune' },
  { name: 'Arctic', keyword: 'Color scheme 48: Arctic' },
  { name: 'Slate', keyword: 'Color scheme 49: Slate' },
  { name: 'Vichy', keyword: 'Color scheme 9: Vichy' }
];

targets.forEach(t => {
  const pos = content.indexOf(t.keyword);
  if (pos === -1) {
    console.log(t.name + ' not found');
    return;
  }
  const searchStart = content.slice(pos, pos + 2000);
  const srcMatch = searchStart.match(/src="data:image\/png;base64,([^"]+)"/);
  if (srcMatch) {
    const base64Data = srcMatch[1];
    fs.writeFileSync(`scratch/${t.name.toLowerCase()}.png`, Buffer.from(base64Data, 'base64'));
    console.log(`Saved scratch/${t.name.toLowerCase()}.png`);
  } else {
    console.log('No base64 image found for ' + t.name);
  }
});
