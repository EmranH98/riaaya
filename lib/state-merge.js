// Three-way merge for the clinic-state blob.
//
//   base   — the state the saving client last loaded, filtered to their view
//   theirs — the state the client submitted (base + their edits)
//   ours   — the state currently in the database (advanced by someone else)
//
// The result keeps both sides' work at per-record granularity: anything the
// client did not touch keeps the current database value, anything they did
// touch takes their value. When both sides changed the SAME record, the
// incoming save wins; an edit always beats a delete so data is never silently
// discarded.

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return false;
  const aIsArray = Array.isArray(a);
  if (aIsArray !== Array.isArray(b)) return false;
  if (aIsArray) {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (!deepEqual(a[index], b[index])) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (!(key in b) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Collections we can merge record-by-record: arrays where every item carries
// a non-empty id (entries, bookings, patients, inventory, expenses, …).
function isIdArray(value) {
  return Array.isArray(value) && value.every(item =>
    isPlainObject(item)
    && (typeof item.id === "string" || typeof item.id === "number")
    && item.id !== "");
}

function mergeIdArrays(baseList, theirsList, oursList) {
  const baseMap = new Map(baseList.map(record => [record.id, record]));
  const theirsMap = new Map(theirsList.map(record => [record.id, record]));
  const seen = new Set();
  const result = [];

  for (const record of oursList) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const theirs = theirsMap.get(record.id);
    const base = baseMap.get(record.id);
    if (theirs) {
      // Untouched by the client → keep ours (it may carry someone's newer
      // edit). Touched → the incoming save wins for this record.
      result.push(deepEqual(theirs, base) ? record : theirs);
    } else if (base) {
      // The client deleted it. Honour the delete unless someone else edited
      // the record since their base — an edit beats a delete.
      if (!deepEqual(record, base)) result.push(record);
    } else {
      result.push(record); // created by someone else while they were editing
    }
  }

  for (const record of theirsList) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const base = baseMap.get(record.id);
    // Not in base → the client created it. In base but edited → someone else
    // deleted it while the client edited it; keep the edit.
    if (!base || !deepEqual(record, base)) result.push(record);
  }

  return result;
}

function mergeValue(base, theirs, ours) {
  if (deepEqual(theirs, base)) return ours;
  if (isIdArray(theirs) && isIdArray(base ?? []) && isIdArray(ours ?? [])) {
    return mergeIdArrays(base ?? [], theirs, ours ?? []);
  }
  if (isPlainObject(theirs) && isPlainObject(ours)) {
    // Keyed maps (settings, reconciliations, salaryApprovals, …): merge one
    // level down so two users changing different keys both keep their change.
    const baseMap = isPlainObject(base) ? base : {};
    const merged = {};
    for (const key of new Set([...Object.keys(ours), ...Object.keys(theirs), ...Object.keys(baseMap)])) {
      const value = deepEqual(theirs[key], baseMap[key]) ? ours[key] : theirs[key];
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  }
  return theirs;
}

// Session-scoped keys the client never legitimately writes.
const SKIP_KEYS = new Set(["accounts", "currentAccountId"]);

export function threeWayMergeState(base, theirs, ours) {
  const baseState = isPlainObject(base) ? base : {};
  const theirsState = isPlainObject(theirs) ? theirs : {};
  const oursState = isPlainObject(ours) ? ours : {};
  const result = {};
  const keys = new Set([
    ...Object.keys(oursState),
    ...Object.keys(theirsState),
    ...Object.keys(baseState)
  ]);
  for (const key of keys) {
    if (SKIP_KEYS.has(key)) continue;
    const value = mergeValue(baseState[key], theirsState[key], oursState[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}
