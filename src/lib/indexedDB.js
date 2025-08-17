import Dexie from 'dexie';

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
  if (!query.trim()) {
    return await db.content.orderBy('date_added').reverse().toArray(); // Return all data sorted by date descending
  }
  const filteredResults = await db.content
    .filter((item) =>
      ['title', 'summary', 'tags', 'channel_name', 'user_notes'].some((key) =>
        item[key]?.toLowerCase().includes(query.toLowerCase())
      )
    )
    .toArray(); // Convert to array before sorting

  return filteredResults.sort((a, b) => new Date(b.date_added) - new Date(a.date_added)); // Sort by date descending
}

export default db;