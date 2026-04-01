import type { AudioFormat, Folder, Track } from '@/types/audio';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'frito_music.db';
const DB_VERSION = 1;

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA synchronous = NORMAL;');
  await migrate(_db);
  return _db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'db_version'");
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        uri TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        duration REAL NOT NULL,
        artwork TEXT,
        folderPath TEXT NOT NULL,
        filename TEXT NOT NULL,
        format TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        createdAt REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tracks_folderPath ON tracks(folderPath);
      CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS scan_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('db_version', ?)", DB_VERSION.toString());
  }
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TrackRow>('SELECT * FROM tracks ORDER BY title COLLATE NOCASE');
  return rows.map(rowToTrack);
}

export async function getTrackCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tracks');
  return row?.count ?? 0;
}

export async function getTracksByFolder(folderPath: string): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks WHERE folderPath = ? ORDER BY title COLLATE NOCASE',
    folderPath,
  );
  return rows.map(rowToTrack);
}

export async function getFolders(): Promise<Folder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    folderPath: string;
    trackCount: number;
    firstArtwork: string | null;
  }>(`
    SELECT
      folderPath,
      COUNT(*) as trackCount,
      (SELECT artwork FROM tracks t2 WHERE t2.folderPath = tracks.folderPath AND artwork IS NOT NULL LIMIT 1) as firstArtwork
    FROM tracks
    GROUP BY folderPath
    ORDER BY folderPath COLLATE NOCASE
  `);

  const folders: Folder[] = [];
  for (const row of rows) {
    const name = extractFolderName(row.folderPath);
    const previews = await db.getAllAsync<TrackRow>(
      'SELECT * FROM tracks WHERE folderPath = ? ORDER BY title COLLATE NOCASE LIMIT 4',
      row.folderPath,
    );
    folders.push({
      id: row.folderPath,
      name,
      path: row.folderPath,
      trackCount: row.trackCount,
      previewTracks: previews.map(rowToTrack),
      artwork: row.firstArtwork ?? undefined,
    });
  }

  return folders;
}

export async function searchTracks(query: string): Promise<Track[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT * FROM tracks
     WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR filename LIKE ?
     ORDER BY title COLLATE NOCASE
     LIMIT 100`,
    pattern,
    pattern,
    pattern,
    pattern,
  );
  return rows.map(rowToTrack);
}

export async function upsertTracks(tracks: Track[]): Promise<void> {
  const db = await getDb();
  const BATCH_SIZE = 200;

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const values: (string | number | null)[] = [];

    for (const t of batch) {
      values.push(
        t.id,
        t.uri,
        t.title,
        t.artist,
        t.album,
        t.duration,
        t.artwork ?? null,
        t.folderPath,
        t.filename,
        t.format,
        t.fileSize,
        t.createdAt,
      );
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO tracks (id, uri, title, artist, album, duration, artwork, folderPath, filename, format, fileSize, createdAt)
       VALUES ${placeholders}`,
      ...values,
    );
  }
}

export async function removeTracksByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const BATCH_SIZE = 200;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM tracks WHERE id IN (${placeholders})`, ...batch);
  }
}

export async function replaceAllTracks(tracks: Track[]): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM tracks');
  await upsertTracks(tracks);
}

export async function getAllTrackIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM tracks');
  return new Set(rows.map(r => r.id));
}

export async function setScanMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO scan_meta (key, value) VALUES (?, ?)', key, value);
}

export async function getScanMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM scan_meta WHERE key = ?', key);
  return row?.value ?? null;
}

interface TrackRow {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string | null;
  folderPath: string;
  filename: string;
  format: string;
  fileSize: number;
  createdAt: number;
}

function rowToTrack(row: TrackRow): Track {
  return {
    id: row.id,
    uri: row.uri,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    artwork: row.artwork ?? undefined,
    folderPath: row.folderPath,
    filename: row.filename,
    format: row.format as AudioFormat,
    fileSize: row.fileSize,
    createdAt: row.createdAt,
  };
}

function extractFolderName(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? path.substring(lastSlash + 1) || 'Unknown Folder' : 'Unknown Folder';
}
