import { parseQuery } from './queryParser.js';

const testQueries = [
  // Basic queries
  'date:21-03-2025+OOPS',
  'site:youtube',
  'site: youtube.com',
  'name:vishva',
  'name: everest',
  'type:People & Blogs',
  '"ShreeMan LegenD"',
  'type:ShreeMan LegenD',

  // Edge cases
  'date:invalid-date',
  'site:',
  'name:',
  'type:',
  '""',
  'date:21/03/2025',
  'date:2025-03-21',

  // Complex queries
  'date:21-03-2025+OOPS site:ExampleSite',
  'type:Video+date:today',
  '"Exact Match"+type:Document',
  'site:Example+type:Blog+date:yesterday',
  'name:Everest+site:youtube',

  // Special characters
  'type:People & Blogs+site:Example@Site',
  '"Special!@#$%^&*()_+Match"',
  'date:15 August 2025+type:Event',

  // Mixed-case filters
  'DATE:21-03-2025+oops',
  'Site:Shradha Khapra',
  'Name:Everest Marathi',
  'Type:People & Blogs',

  // Overlapping keywords and filters
  'type:Type+site:Site+date:Date',
  'type:People+Blogs+site:Shradha+Khapra',
  'name:Everest+type:Document+site:youtube',
];

testQueries.forEach((query) => {
  console.log(`Query: ${query}`);
  console.log('Parsed:', parseQuery(query));
  console.log('---');
});
