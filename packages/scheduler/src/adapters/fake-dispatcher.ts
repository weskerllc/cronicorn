import type { Dispatcher, JobEndpoint } from "@cronicorn/domain";

export class FakeDispatcher implements Dispatcher {
  constructor(private plan: (ep: JobEndpoint) => { status: "success" | "failed"; durationMs: number }) { }
  async execute(ep: JobEndpoint) { return this.plan(ep); }
}
