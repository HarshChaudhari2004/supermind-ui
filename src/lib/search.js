import { supabase } from './supabase';
import { addContentToDB, searchContentInDB } from './indexedDB';
import { parseQuery, hasFilters } from './queryParser';
import { parseDateFilter } from './dateUtils';

const PAGE_SIZE = 200;

/**
 * Perform a search query or fetch default content.
 * @param {string} query - The search query.
 * @param {number} pageNumber - The page number for pagination.
 * @param {string} userId - The ID of the authenticated user.
 * @returns {Promise<{ data: Array, hasMore: boolean }>} - The search results and pagination info.
 */
export async function performSearch(query, pageNumber = 0, userId) {
  const searchId = Date.now();
  performSearch.lastSearchId = searchId;

  try {
    // Check if the query contains filters
    const containsFilters = hasFilters(query);
    console.log(`Performing search for user ${userId} with query "${query}" (page ${pageNumber}) - Filters: ${containsFilters}`);

    // Step 1: Search in IndexedDB
    const localResults = await searchContentInDB(query);
    
    // If query contains filters, ONLY return IndexedDB results (don't fallback to Supabase)
    if (containsFilters) {
      console.log('Query contains filters, using only IndexedDB results');
      return { data: localResults, hasMore: false };
    }
    
    // If we have local results and no filters, return them
    if (localResults.length > 0) {
      return { data: localResults, hasMore: false };
    }

    // Step 2: Fallback to Supabase only for non-filtered queries
    const fromRow = pageNumber * PAGE_SIZE;

    if (!query.trim()) {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', userId)
        .order('date_added', { ascending: false })
        .range(fromRow, fromRow + PAGE_SIZE - 1);

      if (error) throw error;

      return {
        data: data || [],
        hasMore: data.length === PAGE_SIZE,
      };
    }

    const { data, error } = await supabase
      .rpc('search_content', {
        search_query: query,
        user_id_input: userId,
        similarity_threshold: 0.1,
        max_results: PAGE_SIZE,
      });

    if (error) {
      console.error('Search error:', error);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%,tags.ilike.%${query}%,channel_name.ilike.%${query}%,user_notes.ilike.%${query}%`)
        .order('date_added', { ascending: false })
        .range(fromRow, fromRow + PAGE_SIZE - 1);

      if (fallbackError) throw fallbackError;

      return {
        data: (fallbackData || []).sort((a, b) => new Date(b.date_added) - new Date(a.date_added)),
        hasMore: fallbackData.length === PAGE_SIZE,
      };
    }

    // Step 3: Update IndexedDB with new data
    if (data) {
      await addContentToDB(data);
    }

    return {
      data: (data || []).sort((a, b) => new Date(b.date_added) - new Date(a.date_added)),
      hasMore: data.length === PAGE_SIZE,
    };
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
