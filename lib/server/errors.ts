export class StoreError extends Error {
  code: 'not_found' | 'conflict' | 'invalid' | 'rate_limited';
  constructor(code: 'not_found' | 'conflict' | 'invalid' | 'rate_limited', message: string) {
    super(message);
    this.code = code;
  }
}
