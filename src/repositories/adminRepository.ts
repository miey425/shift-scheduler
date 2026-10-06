import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { admins } from "@/db/schema";

export type AdminRole = "owner" | "manager" | "editor" | "viewer";

export type AdminForAuth = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
};

export async function findAdminByEmail(email: string): Promise<AdminForAuth | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const [admin] = await getDb()
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      passwordHash: admins.passwordHash,
      role: admins.role,
      isActive: admins.isActive,
    })
    .from(admins)
    .where(eq(admins.email, normalizedEmail))
    .limit(1);

  return admin ?? null;
}
