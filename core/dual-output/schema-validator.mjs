import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadSchemaSet(schemasDir) {
  const schemas = new Map();
  const files = (await readdir(schemasDir)).filter((file) => file.endsWith('.json'));
  for (const file of files) {
    const schema = JSON.parse(await readFile(path.join(schemasDir, file), 'utf8'));
    schemas.set(file, schema);
    if (schema.$id) schemas.set(schema.$id, schema);
  }
  return schemas;
}

export function validateAgainstSchema(value, schema, schemas = new Map()) {
  const errors = [];
  validateNode(value, schema, schema, schemas, '$', errors);
  return { valid: errors.length === 0, errors };
}

export function assertValid(value, schema, schemas = new Map(), label = 'value') {
  const result = validateAgainstSchema(value, schema, schemas);
  if (!result.valid) throw new Error(`${label} failed schema validation:\n${result.errors.map((error) => `- ${error}`).join('\n')}`);
  return value;
}

function validateNode(value, schema, rootSchema, schemas, location, errors) {
  if (schema?.$ref) {
    const target = resolveReference(schema.$ref, rootSchema, schemas);
    if (!target) {
      errors.push(`${location}: unresolved schema reference ${schema.$ref}`);
      return;
    }
    validateNode(value, target, target, schemas, location, errors);
    return;
  }

  if (Object.hasOwn(schema, 'const') && !Object.is(value, schema.const)) errors.push(`${location}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) errors.push(`${location}: must be one of ${schema.enum.join(', ')}`);
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${location}: expected ${schema.type}, received ${describeType(value)}`);
    return;
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location}: must contain at least ${schema.minLength} characters`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${location}: does not match ${schema.pattern}`);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${location}: must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${location}: must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location}: must contain at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${location}: must contain at most ${schema.maxItems} items`);
    if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, rootSchema, schemas, `${location}[${index}]`, errors));
  }
  if (isPlainObject(value)) {
    for (const required of schema.required ?? []) if (!Object.hasOwn(value, required)) errors.push(`${location}: missing required property ${required}`);
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(properties)) if (Object.hasOwn(value, key)) validateNode(value[key], child, rootSchema, schemas, `${location}.${key}`, errors);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!Object.hasOwn(properties, key)) errors.push(`${location}: unexpected property ${key}`);
    } else if (isPlainObject(schema.additionalProperties)) {
      for (const [key, childValue] of Object.entries(value)) if (!Object.hasOwn(properties, key)) validateNode(childValue, schema.additionalProperties, rootSchema, schemas, `${location}.${key}`, errors);
    }
  }
}

function resolveReference(reference, rootSchema, schemas) {
  if (reference.startsWith('#/')) return reference.slice(2).split('/').reduce((current, key) => current?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], rootSchema);
  return schemas.get(reference) ?? schemas.get(reference.split('#')[0]);
}

function matchesType(value, type) {
  if (type === 'object') return isPlainObject(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return true;
}

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function describeType(value) { return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value; }
