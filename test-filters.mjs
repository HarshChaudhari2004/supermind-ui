// Test script for date filtering and query parsing
import { parseQuery, hasFilters } from './src/lib/queryParser.js';

console.log('=== Date Filter Tests ===');

const testQueries = [
  'date:yesterday',
  'date:last week', 
  'date: yesterday',
  'date: last week',
  'date:16-3-2025+software',
  'date: 16-3-2025+software',
  'date: 16-3-2025 + software',
  'type:education',
  'type: education',
  'site:youtube date:yesterday',
  'site: youtube.com date: last week'
];

testQueries.forEach(query => {
  console.log(`\n--- Testing: "${query}" ---`);
  try {
    const parsed = parseQuery(query);
    const containsFilters = hasFilters(query);
    
    console.log('Parsed result:', JSON.stringify(parsed, null, 2));
    console.log('Has filters:', containsFilters);
    console.log('Date value:', parsed.date);
    
    if (parsed.date) {
      console.log('✅ Date parsed successfully');
    } else if (query.includes('date:')) {
      console.log('❌ Date parsing failed');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

console.log('\n=== Summary ===');
console.log('All tests completed. Check for any ❌ marks above.');
