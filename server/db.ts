import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { guides, InsertGuide, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveGuides() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guides).where(eq(guides.status, "active")).orderBy(desc(guides.updatedAt));
}

export async function getAllGuides() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guides).orderBy(desc(guides.updatedAt));
}

export async function createGuide(input: InsertGuide) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(guides).values(input);
  const created = await db.select().from(guides).where(eq(guides.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function updateGuide(id: number, input: Partial<Pick<InsertGuide, "title" | "category" | "summary" | "content" | "status">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(guides).set(input).where(eq(guides.id, id));
  const updated = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  return updated[0];
}
