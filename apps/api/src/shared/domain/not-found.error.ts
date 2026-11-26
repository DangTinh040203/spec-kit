/** Base class for "the thing asked for does not exist". Mapped to 404 NOT_FOUND. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
