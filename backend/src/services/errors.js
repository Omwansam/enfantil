/**
 * API errors. The error middleware turns them into
 *   { message, field?, fields? }  with the HTTP status,
 * which is what both frontends show inline next to form fields.
 */
export class ApiError extends Error {
  constructor(message, { status = 400, field, fields } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (field) this.field = field
    if (fields) this.fields = fields
  }
}
