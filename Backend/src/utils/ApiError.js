class ApiError extends Error {
    constructor(statusCode, message, errors = [], stack = '') {
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.errors = errors
        this.success = false
        this.data = null

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }

    // Static methods for common errors
    static badRequest(message = 'Bad Request', errors = []) {
        return new ApiError(400, message, errors)
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message)
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message)
    }

    static notFound(message = 'Resource not found') {
        return new ApiError(404, message)
    }

    static conflict(message = 'Conflict') {
        return new ApiError(409, message)
    }

    static tooManyRequests(message = 'Too many requests') {
        return new ApiError(429, message)
    }

    static internal(message = 'Internal Server Error') {
        return new ApiError(500, message)
    }

    static serviceUnavailable(message = 'Service Unavailable') {
        return new ApiError(503, message)
    }
}

export default ApiError
