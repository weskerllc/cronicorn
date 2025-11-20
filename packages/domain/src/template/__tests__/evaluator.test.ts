/**
 * Tests for template evaluator
 */

import { describe, expect, it } from "vitest";

import type { TemplateContext } from "../types.js";

import { evaluateBodyTemplate, hasTemplateExpressions } from "../evaluator.js";

describe("evaluateBodyTemplate", () => {
  const mockContext: TemplateContext = {
    self: {
      endpointId: "ep-123",
      endpointName: "status-checker",
      latestResponse: {
        status: "healthy",
        load: 42,
        metrics: {
          cpu: 75,
          memory: 60,
        },
      },
    },
    siblings: {
      "monitoring-endpoint": {
        endpointId: "ep-456",
        endpointName: "monitoring-endpoint",
        latestResponse: {
          priority: "high",
          alert_count: 3,
        },
      },
      "data-endpoint": {
        endpointId: "ep-789",
        endpointName: "data-endpoint",
        latestResponse: {
          records: 150,
          ready: true,
        },
      },
    },
    now: "2025-01-15T10:30:00Z",
  };

  describe("simple value resolution", () => {
    it("should resolve self.latestResponse fields", () => {
      const template = {
        status: "{{$.self.latestResponse.status}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        status: "healthy",
      });
    });

    it("should resolve nested fields", () => {
      const template = {
        cpu: "{{$.self.latestResponse.metrics.cpu}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        cpu: 75,
      });
    });

    it("should resolve $.now to current timestamp", () => {
      const template = {
        timestamp: "{{$.now}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        timestamp: "2025-01-15T10:30:00Z",
      });
    });
  });

  describe("sibling endpoint resolution", () => {
    it("should resolve sibling endpoint fields", () => {
      const template = {
        priority: "{{$.siblings['monitoring-endpoint'].latestResponse.priority}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        priority: "high",
      });
    });

    it("should resolve multiple sibling fields", () => {
      const template = {
        monitor_priority: "{{$.siblings['monitoring-endpoint'].latestResponse.priority}}",
        data_records: "{{$.siblings['data-endpoint'].latestResponse.records}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        monitor_priority: "high",
        data_records: 150,
      });
    });
  });

  describe("complex templates", () => {
    it("should handle nested objects with templates", () => {
      const template = {
        status: "{{$.self.latestResponse.status}}",
        metadata: {
          priority: "{{$.siblings['monitoring-endpoint'].latestResponse.priority}}",
          timestamp: "{{$.now}}",
        },
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        status: "healthy",
        metadata: {
          priority: "high",
          timestamp: "2025-01-15T10:30:00Z",
        },
      });
    });

    it("should handle arrays with templates", () => {
      const template = {
        values: [
          "{{$.self.latestResponse.status}}",
          "{{$.siblings['data-endpoint'].latestResponse.records}}",
        ],
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        values: ["healthy", 150],
      });
    });

    it("should preserve type of resolved values", () => {
      const template = {
        string_val: "{{$.self.latestResponse.status}}",
        number_val: "{{$.self.latestResponse.load}}",
        boolean_val: "{{$.siblings['data-endpoint'].latestResponse.ready}}",
        null_val: null,
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        string_val: "healthy",
        number_val: 42,
        boolean_val: true,
        null_val: null,
      });
    });
  });

  describe("string interpolation", () => {
    it("should interpolate templates in strings", () => {
      const template = {
        message: "Status is {{$.self.latestResponse.status}} with load {{$.self.latestResponse.load}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        message: "Status is healthy with load 42",
      });
    });

    it("should handle multiple templates in one string", () => {
      const template = {
        summary: "{{$.self.latestResponse.status}} at {{$.now}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        summary: "healthy at 2025-01-15T10:30:00Z",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle missing fields gracefully", () => {
      const template = {
        missing: "{{$.self.latestResponse.nonexistent}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        missing: "{{$.self.latestResponse.nonexistent}}",
      });
    });

    it("should handle missing sibling gracefully", () => {
      const template = {
        missing: "{{$.siblings['nonexistent'].latestResponse.value}}",
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        missing: "{{$.siblings['nonexistent'].latestResponse.value}}",
      });
    });

    it("should handle static values without templates", () => {
      const template = {
        static: "hello",
        number: 123,
        boolean: true,
      };

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual(template);
    });

    it("should handle empty template", () => {
      const template = {};

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({});
    });

    it("should handle null template", () => {
      const template = null;

      const result = evaluateBodyTemplate(template, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toBe(null);
    });
  });
});

describe("hasTemplateExpressions", () => {
  it("should detect templates in strings", () => {
    expect(hasTemplateExpressions("{{$.self.value}}")).toBe(true);
    expect(hasTemplateExpressions("no template")).toBe(false);
  });

  it("should detect templates in objects", () => {
    expect(hasTemplateExpressions({ key: "{{$.value}}" })).toBe(true);
    expect(hasTemplateExpressions({ key: "static" })).toBe(false);
  });

  it("should detect templates in arrays", () => {
    expect(hasTemplateExpressions(["{{$.value}}"])).toBe(true);
    expect(hasTemplateExpressions(["static"])).toBe(false);
  });

  it("should detect templates in nested structures", () => {
    expect(hasTemplateExpressions({
      outer: {
        inner: "{{$.value}}",
      },
    })).toBe(true);

    expect(hasTemplateExpressions({
      outer: {
        inner: "static",
      },
    })).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(hasTemplateExpressions(123)).toBe(false);
    expect(hasTemplateExpressions(true)).toBe(false);
    expect(hasTemplateExpressions(null)).toBe(false);
  });
});
