/**
 * Parses an advanced search query into structured filters.
 * @param {string} query - The search query string.
 * @returns {Object} - Parsed filters and keywords.
 */
function parseQuery(query) {
  // Ensure query is a string
  if (!query || typeof query !== 'string') {
    return {
      keywords: [],
      text: null,
      site: null,
      name: null,
      tag: null,
      type: null,
      date: null,
      exact: null,
    };
  }

  const filters = {
    keywords: [],
    text: null,
    site: null,
    name: null,
    tag: null,
    type: null,
    date: null,
    exact: null,
  };

  // Pre-process the query to handle multi-word filter values
  let processedQuery = query;
  
  // Handle multi-word date values like "last week", "last month"
  processedQuery = processedQuery.replace(/(date\s*:\s*)(last\s+week|last\s+month|this\s+week|this\s+month)(\s|$)/gi, (match, prefix, dateValue, suffix) => {
    return prefix.replace(/\s/g, '') + dateValue.replace(/\s+/g, '_') + suffix;
  });
  
  // Handle other multi-word patterns that might need quotes
  processedQuery = processedQuery.replace(/\b(site\s*:\s*|name\s*:\s*|type\s*:\s*)([^"\s]+(?:\s+[^"\s]+)*?)(?=\s+\w+:|$)/gi, (match, prefix, value) => {
    // Only add quotes if the value contains spaces and isn't already quoted
    if (value.includes(' ') && !value.startsWith('"')) {
      return prefix.replace(/\s/g, '') + '"' + value.trim() + '"';
    }
    return prefix.replace(/\s/g, '') + value.trim();
  });

  // Split query into tokens, handling quoted strings properly
  const tokens = processedQuery.match(/"[^"]*"|[^\s"]+/g) || [];

  let currentFilter = null;

  tokens.forEach((token) => {
    // Handle quoted tokens (these might be multi-word filter values)
    let cleanToken = token;
    if (token.startsWith('"') && token.endsWith('"')) {
      cleanToken = token.slice(1, -1);
    }

    // Handle filter patterns with optional whitespace after colon
    const filterMatch = cleanToken.match(/^(text|site|name|tag|type|date)\s*:\s*(.*)$/i);
    if (filterMatch) {
      const filterName = filterMatch[1].toLowerCase();
      const filterValue = filterMatch[2].trim();

      if (filterName === 'text') {
        filters.text = filterValue;
        currentFilter = null;
      } else if (filterName === 'site') {
        filters.site = filterValue;
        currentFilter = 'site';
      } else if (filterName === 'name') {
        filters.name = filterValue;
        currentFilter = 'name';
      } else if (filterName === 'tag') {
        filters.tag = filterValue;
        currentFilter = null;
      } else if (filterName === 'type') {
        filters.type = filterValue;
        currentFilter = 'type';
      } else if (filterName === 'date') {
        const dateParts = filterValue.split('+');
        const dateValue = dateParts[0].trim();

        // Validate date value (allow multi-word dates like "last week")
        if (!dateValue || dateValue.length < 3) {
          console.error('Invalid date value in query:', token);
          filters.date = null;
        } else {
          // Convert underscores back to spaces for multi-word dates
          filters.date = dateValue.replace(/_/g, ' ');
        }

        if (dateParts[1]) {
          filters.keywords.push(dateParts[1].trim());
        }
        currentFilter = null;
      }
    } else if (token.startsWith('"') && token.endsWith('"')) {
      // This is an exact phrase search
      filters.exact = cleanToken;
      currentFilter = null;
    } else if (currentFilter === 'site') {
      filters.site += ` ${cleanToken}`;
    } else if (currentFilter === 'name') {
      filters.name += ` ${cleanToken}`;
    } else if (currentFilter === 'type') {
      filters.type += ` ${cleanToken}`;
    } else {
      // Handle remaining tokens as keywords
      filters.keywords.push(...cleanToken.split('+').map(k => k.trim()).filter(k => k));
    }
  });

  return filters;
}

/**
 * Checks if a query contains any filters
 * @param {string} query - The search query string
 * @returns {boolean} - True if the query contains filters, false otherwise
 */
function hasFilters(query) {
  const filters = parseQuery(query);
  return !!(filters.text || filters.site || filters.name || filters.tag || filters.type || filters.date || filters.exact);
}

export { parseQuery, hasFilters };
