// Explicit historical-format fixtures cannot contain the v6-only incarnation field.
export function preIncarnationShape(game) {
  const value = structuredClone(game);
  delete value.incarnation;
  return value;
}
