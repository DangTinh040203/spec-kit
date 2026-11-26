import { registerDecorator, type ValidationOptions } from 'class-validator';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Counts characters as a person reads them (grapheme clusters), so "Mua sữa" is 7. */
function graphemeCount(value: string): number {
  let count = 0;
  for (const _ of segmenter.segment(value)) {
    count += 1;
  }
  return count;
}

export function GraphemeLength(min: number, max: number, options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'graphemeLength',
      target: object.constructor,
      propertyName,
      constraints: [min, max],
      options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          const length = graphemeCount(value);
          return length >= min && length <= max;
        },
        defaultMessage(): string {
          return min === 0
            ? `must be at most ${max} characters`
            : `must be ${min}–${max} characters`;
        },
      },
    });
  };
}
