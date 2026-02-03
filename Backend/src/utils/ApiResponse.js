class ApiResponse {
    constructor(statusCode, data, message = 'Success') {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }

    // Static methods for common responses
    static success(data, message = 'Success') {
        return new ApiResponse(200, data, message)
    }

    static created(data, message = 'Resource created successfully') {
        return new ApiResponse(201, data, message)
    }

    static noContent(message = 'No content') {
        return new ApiResponse(204, null, message)
    }
}

export default ApiResponse
