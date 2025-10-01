class AppError extends Error {
  constructor(message, statusCode) {
    console.log(message, '----message---- AppError----');

    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    console.log(this.constructor, '--this.constructor--AppError----');

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

