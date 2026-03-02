class ApiError extends Error {
    constructor(
        statusCode = 500,
        message = "Something went wrong",
        error = [],
        stack = ""
    ) {
        super(message)
        this.name = "ApiError"
        this.data = null
        this.statusCode = statusCode
        this.message = message
        this.success = false
        this.errors = error

        if(stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}


export {ApiError}