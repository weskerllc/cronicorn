import type { Dispatcher, JobEndpoint } from "../domain/ports.js";

export class FakeDispatcher implements Dispatcher {
  constructor(private plan: (ep: JobEndpoint) => { status: "success" | "failed"; durationMs: number }) { }
  async execute(ep: JobEndpoint) { return this.plan(ep); }
}
