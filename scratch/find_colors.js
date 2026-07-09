const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\2ea711f7-66bd-478a-9d25-c0b1a7a2aac5\\.system_generated\\steps\\332\\content.md', 'utf8');

const targetSchemes = ['Sapphire', 'Neptune', 'Arctic', 'Slate', 'Vichy'];

targetSchemes.forEach(name => {
  console.log(`\n=================== ${name} ===================`);
  let idx = 0;
  let count = 0;
  while (count < 3) {
    idx = content.indexOf(name, idx);
    if (idx === -1) break;
    console.log(`Match ${count} at ${idx}:`);
    console.log(content.slice(idx - 100, idx + 400).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 300));
    idx += name.length;
    count++;
  }
});
