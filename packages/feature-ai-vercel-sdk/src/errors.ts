// Domain-specific error types for AI client adapter

export class AIClientError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = "AIClientError";
    }
}

export class AIClientTransientError extends AIClientError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = "AIClientTransientError";
    }
}

export class AIClientFatalError extends AIClientError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = "AIClientFatalError";
    }
}
