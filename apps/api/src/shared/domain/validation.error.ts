export interface ValidationIssue {
  field: string;
  reason: string;
}

/** Base class for rejected input; lists every failing field at once. Mapped to 400 VALIDATION_ERROR. */
export class ValidationError extends Error {
  readonly details: ValidationIssue[];

  constructor(details: ValidationIssue[], message = 'The request is not valid.') {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}
