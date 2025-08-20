const fs = require('fs');

// Read the queryParser file
const content = fs.readFileSync('src/lib/queryParser.js', 'utf8');

// Convert ES6 module to CommonJS
const moduleCode = content
  .replace('export function parseQuery', 'function parseQuery')
  .replace(/export\s*\{[^}]+\}/, '');

// Execute the module code
eval(moduleCode);

// Test the parseQuery function
console.log('Testing date:yesterday');
const result1 = parseQuery('date:yesterday');
console.log(JSON.stringify(result1, null, 2));

console.log('\nTesting date:last week');
const result2 = parseQuery('date:last week');
console.log(JSON.stringify(result2, null, 2));

console.log('\nTesting mixed query');
const result3 = parseQuery('test date:yesterday site:instagram');
console.log(JSON.stringify(result3, null, 2));

// Test hasFilters function
console.log('\nTesting hasFilters function');
console.log('hasFilters("date:yesterday"):', typeof hasFilters !== 'undefined' ? hasFilters("date:yesterday") : 'function not found');
console.log('hasFilters("test date:yesterday site:instagram"):', typeof hasFilters !== 'undefined' ? hasFilters("test date:yesterday site:instagram") : 'function not found');
console.log('hasFilters("just keywords"):', typeof hasFilters !== 'undefined' ? hasFilters("just keywords") : 'function not found');
