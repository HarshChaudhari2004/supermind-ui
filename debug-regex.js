// Debug the regex step by step
const testQuery = 'date:last week';
console.log('Original query:', testQuery);

// Test the regex pattern
const regex = /(date\s*:\s*)(last\s+week|last\s+month|this\s+week|this\s+month)(\s|$)/gi;
const match = testQuery.match(regex);
console.log('Regex match:', match);

// Test the replacement
const processedQuery = testQuery.replace(regex, (match, prefix, dateValue, suffix) => {
  console.log('Match parts:', { match, prefix, dateValue, suffix });
  return prefix.replace(/\s/g, '') + dateValue.replace(/\s+/g, '_') + suffix;
});

console.log('Processed query:', processedQuery);

// Test tokenization
const tokens = processedQuery.match(/"[^"]*"|[^\s"]+/g) || [];
console.log('Tokens:', tokens);

// Test each token individually
tokens.forEach((token, index) => {
  console.log(`Token ${index}:`, token);
  
  let cleanToken = token;
  if (token.startsWith('"') && token.endsWith('"')) {
    cleanToken = token.slice(1, -1);
    console.log(`  Clean token:`, cleanToken);
  }
  
  const filterMatch = cleanToken.match(/^(text|site|name|tag|type|date)\s*:\s*(.*)$/i);
  if (filterMatch) {
    console.log(`  Filter match:`, filterMatch);
    console.log(`  Filter name: "${filterMatch[1]}", Filter value: "${filterMatch[2]}"`);
  } else {
    console.log(`  No filter match`);
  }
});
