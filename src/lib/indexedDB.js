import Dexie from 'dexie';
import { parseQuery, hasFilters } from './queryParser';
import { parseDateFilter } from './dateUtils';

// Initialize the database
const db = new Dexie('SuperMindDB');
db.version(1).stores({
  content: 'id, user_id, title, summary, tags, channel_name, user_notes, date_added', // Define schema
});

// Add data to IndexedDB
export async function addContentToDB(data) {
  await db.content.bulkPut(data);
}

// Query data from IndexedDB
export async function searchContentInDB(query) {
  const filters = parseQuery(query);

  const results = await db.content.filter((item) => {
    // Filter by text
    if (filters.text && !item.user_notes?.toLowerCase().includes(filters.text.toLowerCase())) {
      return false;
    }

    // Filter by site (match against original_url)
    if (filters.site) {
      const siteKeywords = filters.site.toLowerCase().split(/\s+/);
      if (!siteKeywords.some((keyword) => item.original_url?.toLowerCase().includes(keyword))) {
        return false;
      }
    }

    // Filter by name (match against channel_name)
    if (filters.name) {
      const nameKeywords = filters.name.toLowerCase().split(/\s+/);
      if (!nameKeywords.some((keyword) => item.channel_name?.toLowerCase().includes(keyword))) {
        return false;
      }
    }

    // Filter by tag
    if (filters.tag && !item.tags?.toLowerCase().includes(filters.tag.toLowerCase())) {
      return false;
    }

    // Filter by type
    if (filters.type && item.video_type?.toLowerCase() !== filters.type.toLowerCase()) {
      return false;
    }

    // Filter by exact match
    if (filters.exact && !item.title?.toLowerCase().includes(filters.exact.toLowerCase())) {
      return false;
    }

    // Filter by date
    if (filters.date) {
      const { startDate, endDate } = parseDateFilter(filters.date) || {};
      if (!startDate || !endDate) {
        console.error('Invalid date filter:', filters.date);
        return false; // Invalid date format
      }

      const itemDate = new Date(item.date_added);
      console.debug('Comparing dates:', {
        itemDate,
        startDate,
        endDate,
      });

      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }

    // Filter by keywords (all keywords must match)
    if (filters.keywords.length > 0 && !filters.keywords.every((keyword) => {
      return ['title', 'summary', 'tags', 'channel_name', 'user_notes'].some((key) =>
        item[key]?.toLowerCase().includes(keyword.toLowerCase())
      );
    })) {
      return false;
    }

    return true;
  }).toArray();

  // Sort by date_added descending
  return results.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
}

export default db;

// Re-export hasFilters for convenience
export { hasFilters };