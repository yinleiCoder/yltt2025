export type RelatedRecord<T> = T | T[] | null | undefined;

export function firstRelatedRecord<T>(record: RelatedRecord<T>): T | null {
  return Array.isArray(record) ? record[0] ?? null : record ?? null;
}
