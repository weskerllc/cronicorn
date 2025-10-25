export class FakeClock {
  private t: number;
  constructor(startIso = "2025-01-01T00:00:00Z") { this.t = Date.parse(startIso); }
  now() { return new Date(this.t); }
  async sleep(ms: number) { this.t += ms; }
}
