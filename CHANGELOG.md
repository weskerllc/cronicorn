# 1.0.0 (2025-10-24)


### Bug Fixes

* Bump ([d03f8c0](https://github.com/bcanfield/mvpmvp/commit/d03f8c0067918b83ffaf3fb949880b504289a5dd))


### Features

* **adapter-pino:** implement PinoLoggerAdapter ([aaca613](https://github.com/bcanfield/mvpmvp/commit/aaca6135af69e3d5570a87fbfb5b39d076396440))
* add comprehensive flash sale assertions covering all 4 tiers + coordination ([f1286ae](https://github.com/bcanfield/mvpmvp/commit/f1286ae100847cf888527e445b177c85ef9a896b))
* add FlashSaleSnapshot type and improve rendering to show real metrics ([6ffa96c](https://github.com/bcanfield/mvpmvp/commit/6ffa96c67078ac826adfd9caa3e6ad99878be9f1))
* create FlashSaleMetricsRepo with query helpers ([9d5adbc](https://github.com/bcanfield/mvpmvp/commit/9d5adbc15d5df5c8da861b97cd02ae9c86c1ddb7))
* define flash sale metrics timeline data structure ([a27261d](https://github.com/bcanfield/mvpmvp/commit/a27261d0ecb90bbca64c6a14f24a147c314e33a6))
* **domain:** add FakeLogger test fixture ([2c92e96](https://github.com/bcanfield/mvpmvp/commit/2c92e969201c5cb9b467c2bc38ad5e976f14aa53))
* **domain:** add Logger port for structured logging ([a147f15](https://github.com/bcanfield/mvpmvp/commit/a147f1506463703228ef45320dc6d34b55d2ec4e))
* implement Alert Tier endpoints (slack ops, support, oncall page) with escalation ([c1590b6](https://github.com/bcanfield/mvpmvp/commit/c1590b69a5c75c5ab94d541d2fd2402313cbb6a1))
* implement Health Tier endpoints (traffic monitor, order processor, inventory sync) ([fb4e5c0](https://github.com/bcanfield/mvpmvp/commit/fb4e5c0e5c0cc89f3cf55c53fa5cc505f05e1609))
* implement Investigation Tier endpoints (slow page analyzer, db query trace) ([afd7388](https://github.com/bcanfield/mvpmvp/commit/afd7388018ba92171f1a92854c1b9b449b71833c))
* implement Recovery Tier endpoints (cache warmup, scale checkout workers) with cooldowns ([d45d0e7](https://github.com/bcanfield/mvpmvp/commit/d45d0e79839cedda54be55337bd35e1dcbe51e17))
* **scheduler:** add logger to SchedulerDeps and wire Pino ([03fabff](https://github.com/bcanfield/mvpmvp/commit/03fabffc979758cbc07b5b84b39b388328c54479))
* **scheduler:** replace console.log with structured logging ([1619435](https://github.com/bcanfield/mvpmvp/commit/1619435617940e3039973adf7d1956dfad4abfd8))
* UI Init ([3ff2e09](https://github.com/bcanfield/mvpmvp/commit/3ff2e0934e14094c2b27fd23536dd106232b767d))
* wire flash sale scenario into simulator (Health Tier validated) ([f04abe1](https://github.com/bcanfield/mvpmvp/commit/f04abe1bfb1de1ed60f92a491ebb79becd8fe4e7))
