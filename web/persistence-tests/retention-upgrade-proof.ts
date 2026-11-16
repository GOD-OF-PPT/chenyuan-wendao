import { expect } from '@playwright/test';

/** Account for every new DB11 row, while preserving all original stores exactly. */
export function expectBaselineUpgrade(before: any, after: any) {
  const raw = before.format === 'chenyuan-raw-database-backup';
  const inventory = (snapshot: any, name: string) =>
    raw
      ? snapshot.stores.find((s: any) => s.name === name)?.entries
      : snapshot[name];
  const receipts = inventory(before, 'full-receipts'),
    backups = inventory(before, 'full-backups'),
    current = inventory(before, 'full-state').find(
      (r: any) => r.key === 'current',
    ).value,
    actual = inventory(after, 'full-retention'),
    expected: any[] = [],
    histories = new Map<string, any>();
  expect(Array.isArray(actual)).toBe(true);
  expected.push({
    key: 'counter',
    value: {
      format: 'chenyuan-retention',
      version: 1,
      epoch: 0,
      sequence: receipts.length,
      runId: current.core.runId,
    },
  });
  for (let i = 0; i < receipts.length; i++) {
    const original = receipts[i],
      r = original.value;
    let id: any,
      activityId: string | null = null,
      ordinal: number | null = null,
      role = 'control',
      windowId: string | null = null,
      checkpointRevision: number | null = null;
    if (r.format === 'chenyuan-control-receipt') id = r.mutation;
    else if (r.format === 'chenyuan-receipt') id = r.command;
    else if (
      ['chenyuan-configuration-receipt', 'chenyuan-direct-receipt'].includes(
        r.format,
      )
    )
      id = r.intent.command;
    else if (r.format === 'chenyuan-activity-receipt') {
      id = r.input.kind === 'TICK' ? r.input.tick : r.input.mutation;
      activityId = r.activity.id;
      role =
        r.input.kind === 'START'
          ? 'start'
          : r.input.kind === 'TICK'
            ? 'cycle'
            : 'control';
      if (role === 'cycle' && r.command && r.result) {
        ordinal = r.activity.completedCycles;
        if (['BREAKTHROUGH', 'START_TRIAL'].includes(r.command.type))
          checkpointRevision = r.result.revisionBefore;
        const key = JSON.stringify([id.runId, activityId]),
          prior = histories.get(key);
        histories.set(key, {
          format: 'chenyuan-retained-history',
          version: 1,
          kind: 'history',
          runId: id.runId,
          activityId,
          total: Math.max(prior?.total ?? 0, ordinal!),
          deleted: 0,
          baseline: true,
        });
      }
    } else if (r.format === 'chenyuan-scheduled-receipt') {
      id = r.input.mutation;
      activityId = r.proof.recordAfter.activity.id;
      role = ['START', 'ADOPT'].includes(r.input.kind)
        ? 'start'
        : r.input.kind === 'ADVANCE'
          ? 'advance'
          : 'control';
      if (role === 'advance' && r.proof.cycles > 0)
        windowId = r.proof.scheduleBefore?.window?.id ?? id.commandId;
    } else
      throw Error(
        'The explicit old-source fixture contains an unreviewed receipt family',
      );
    expect(original.key).toBe(id.runId + ':' + id.commandId);
    expected.push({
      key: ['receipt', original.key],
      value: {
        format: 'chenyuan-retained-receipt',
        version: 1,
        kind: 'receipt',
        key: original.key,
        sequence: i + 1,
        baseline: true,
        pending: false,
        parentKey: original.key,
        receiverId: null,
        runId: id.runId,
        commandId: id.commandId,
        activityId,
        ordinal,
        role,
        windowId,
        checkpointRevision,
        checksum: null,
      },
    });
  }
  for (const h of histories.values())
    expected.push({ key: ['history', h.runId, h.activityId], value: h });
  for (const b of backups)
    expected.push({
      key: ['baseline-backup', b.key],
      value: { format: 'chenyuan-baseline-backup', version: 1, key: b.key },
    });
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected));
  expect(new Set(actual.map((r: any) => JSON.stringify(r.key))).size).toBe(
    actual.length,
  );
  const upgraded = structuredClone(before);
  if (raw) {
    expect(upgraded.database.version).toBeLessThan(11);
    upgraded.database.version = 11;
    if (!upgraded.stores.some((s: any) => s.name === 'full-schedules'))
      upgraded.stores.push({ name: 'full-schedules', entries: [] });
    upgraded.stores.push({ name: 'full-retention', entries: actual });
    upgraded.stores.sort((a: any, b: any) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
  } else {
    expect(upgraded.version).toBeLessThan(11);
    upgraded.version = 11;
    if (!upgraded.stores.includes('full-schedules')) {
      upgraded['full-schedules'] = [];
      upgraded.stores.push('full-schedules');
    }
    upgraded['full-retention'] = actual;
    upgraded.stores.push('full-retention');
    upgraded.stores.sort();
  }
  expect(after).toEqual(upgraded);
}
