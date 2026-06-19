import { and, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

type SoftDeleteColumn = {
  deletedAt: AnyPgColumn;
};

export function withSoftDelete<TTable extends SoftDeleteColumn>(table: TTable, condition?: SQL<unknown>): SQL<unknown> {
  const notDeleted = isNull(table.deletedAt);
  return condition ? (and(notDeleted, condition) ?? notDeleted) : notDeleted;
}
