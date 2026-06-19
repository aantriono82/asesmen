import { eq } from "drizzle-orm";
import type { CreateUserInput, UserRepository } from "@domain/repositories/user-repository";
import type { UserEntity } from "@domain/entities/user";
import { db } from "@infra/database/client";
import { users } from "@infra/database/schema";
import { withSoftDelete } from "@infra/database/soft-delete";

export class DrizzleUserRepository implements UserRepository {
  public async create(input: CreateUserInput): Promise<UserEntity> {
    const [created] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }

    return created;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.findFirstByEmail(email.toLowerCase());

    return user ?? null;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const user = await this.findFirstById(id);

    return user ?? null;
  }

  private async findFirstByEmail(email: string): Promise<UserEntity | null> {
    try {
      return (await db.query.users.findFirst({
        where: withSoftDelete(users, eq(users.email, email))
      })) ?? null;
    } catch (error: unknown) {
      if (isMissingColumnError(error, "deleted_at")) {
        return (await db.query.users.findFirst({
          where: eq(users.email, email)
        })) ?? null;
      }

      throw error;
    }
  }

  private async findFirstById(id: string): Promise<UserEntity | null> {
    try {
      return (await db.query.users.findFirst({
        where: withSoftDelete(users, eq(users.id, id))
      })) ?? null;
    } catch (error: unknown) {
      if (isMissingColumnError(error, "deleted_at")) {
        return (await db.query.users.findFirst({
          where: eq(users.id, id)
        })) ?? null;
      }

      throw error;
    }
  }
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  return Boolean(
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703" &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string" &&
    (error as { message?: string }).message?.includes(columnName)
  );
}
