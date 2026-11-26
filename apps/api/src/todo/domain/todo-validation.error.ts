import { ValidationError, type ValidationIssue } from '../../shared/domain/validation.error.js';

export class TodoValidationError extends ValidationError {
  constructor(details: ValidationIssue[]) {
    super(details, 'The todo is not valid.');
  }
}
