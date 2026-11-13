import { RuleError } from '../../src/full/errors.ts';

/** Opaque outer intent identity. The epoch is a storage boundary, not a Game revision. */
export function issueReceiptId(epoch: number): string {
  if (!Number.isSafeInteger(epoch) || epoch < 0)
    throw new RuleError(
      'RETENTION_INVALID',
      '旧记载的留存信息需要核对，原件已保留',
    );
  return 'r' + epoch.toString(36) + '-' + crypto.randomUUID();
}
export function receiptIdEpoch(id: string): number | null {
  if (id.length > 100) return null;
  const match =
    /^r([0-9a-z]+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.exec(
      id,
    );
  if (!match) return null;
  const epoch = Number.parseInt(match[1], 36);
  return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : null;
}
