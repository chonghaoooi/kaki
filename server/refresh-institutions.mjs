import { writeFile } from 'node:fs/promises';

const endpoint = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_688b934f82c1059ed0a6993d2a829089&limit=500';
const response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`MOE directory fetch failed: ${response.status}`);
const body = await response.json();
const records = body.result?.records;
if (!Array.isArray(records) || records.length < 300 || body.result.total > records.length) throw new Error('The directory response is incomplete; current snapshot preserved.');
const cleaned = records.map(row => {
  for (const key of ['school_name', 'url_address', 'mainlevel_code']) if (typeof row[key] !== 'string') throw new Error(`Missing required directory field: ${key}`);
  return { school_name: row.school_name, url_address: row.url_address, mainlevel_code: row.mainlevel_code };
});
await writeFile(new URL('./school-directory-source.json', import.meta.url), JSON.stringify(cleaned, null, 2) + '\n');
console.log(`Updated ${cleaned.length} school records from the official MOE dataset. Review the snapshot and rerun API tests before use.`);
