import type { FieldDefinition } from '../types'

export async function validateFieldValues(
  db: D1Database,
  parentType: 'entity_type' | 'relationship_type',
  parentTypeId: string,
  fieldValues: Record<string, unknown>
): Promise<string[]> {
  const { results: defs } = await db.prepare(
    'SELECT * FROM field_definitions WHERE parent_type = ? AND parent_type_id = ?'
  ).bind(parentType, parentTypeId).all<FieldDefinition>()

  const errors: string[] = []

  for (const def of defs) {
    const value = fieldValues[def.name]
    const blank = value === undefined || value === null || String(value).trim() === ''

    if (def.required && blank) {
      errors.push(`${def.name} is required`)
      continue
    }

    if (!blank) {
      const err = checkType(def.name, def.data_type, value)
      if (err) errors.push(err)
    }
  }

  return errors
}

function checkType(name: string, dataType: string, value: unknown): string | null {
  const str = String(value)
  switch (dataType) {
    case 'number':
      if (isNaN(Number(str))) return `${name} must be a number`
      break
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${name} must be a date (YYYY-MM-DD)`
      break
    case 'datetime':
      if (isNaN(Date.parse(str))) return `${name} must be a valid datetime`
      break
    case 'partial_date':
      if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(str))
        return `${name} must be a partial date (YYYY, YYYY-MM, or YYYY-MM-DD)`
      break
    case 'boolean':
      if (!['true', 'false', '1', '0'].includes(str.toLowerCase()))
        return `${name} must be a boolean`
      break
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return `${name} must be a valid email`
      break
    case 'url':
      try { new URL(str) } catch { return `${name} must be a valid URL` }
      break
  }
  return null
}
