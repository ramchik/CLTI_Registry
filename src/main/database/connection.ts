import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SCHEMA_SQL } from './schema';

let db: Database.Database | null = null;

/**
 * Get or create the database connection.
 * Database path can be set via settings; defaults to user data directory.
 */
export function getDatabase(dbPath?: string): Database.Database {
  if (db) return db;

  const finalPath = dbPath || getDefaultDbPath();
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(finalPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(SCHEMA_SQL);

  // Create default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const hash = hashPassword('admin');
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function getDefaultDbPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(homeDir, '.clti-registry', 'registry.db');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

/**
 * Create an encrypted backup of the database file.
 */
export function createBackup(backupDir: string): string {
  if (!db) throw new Error('Database not open');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `clti-backup-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Use SQLite backup API
  db.backup(backupPath).then(() => {
    // Encrypt the backup file
    const key = crypto.scryptSync('clti-registry-backup', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const input = fs.readFileSync(backupPath);
    const encrypted = Buffer.concat([iv, cipher.update(input), cipher.final()]);
    fs.writeFileSync(backupPath + '.enc', encrypted);
    fs.unlinkSync(backupPath); // Remove unencrypted backup
  });

  return backupPath + '.enc';
}

/**
 * Restore database from encrypted backup.
 */
export function restoreBackup(backupPath: string, targetPath: string): void {
  const key = crypto.scryptSync('clti-registry-backup', 'salt', 32);
  const encrypted = fs.readFileSync(backupPath);
  const iv = encrypted.subarray(0, 16);
  const data = encrypted.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  fs.writeFileSync(targetPath, decrypted);
}
