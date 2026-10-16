export class SessionScope {
  private controller = new AbortController();
  get signal() {
    return this.controller.signal;
  }
  assertActive() {
    if (this.signal.aborted) throw new Error('Session ended');
  }
  dispose() {
    this.controller.abort();
  }
  async run<T>(task: () => Promise<T>): Promise<T> {
    this.assertActive();
    const result = await task();
    this.assertActive();
    return result;
  }
}
