// const AppError = require("./../utils/appError");

// const handleCastErrorDB = (err) => {
//   const message = `Invalid ${err.path}: ${err.value}.`;
//   return new AppError(message, 400);
// };

// const handleDuplicateFieldsDB = (err) => {
//   const value = err.message.match(/(["'])(\\?.)*?\1/)[0];

//   const message = `${JSON.parse(value)} is already exist!`;
//   return new AppError(message, 400);
// };

// const handleValidationErrorDB = (err) => {
//   const errors = Object.values(err.errors).map((el) => el.message);

//   const message = `Invalid input data. ${errors.join(". ")}`;
//   return new AppError(message, 400);
// };

// const handleJWTError = () =>
//   new AppError("Invalid token. Please log in again!", 401);

// const handleJWTExpiredError = () =>
//   new AppError("Your token has expired! Please log in again.", 401);

// const sendErrorDev = (err, req, res) => {
//   // A) API
//   if (req.originalUrl.startsWith("/api")) {
//     return res.status(err.statusCode).json({
//       status: err.status,
//       // error: err,
//       message: err.message,
//       // stack: err.stack,
//     });
//   }

//   // B) RENDERED WEBSITE
//   console.error("ERROR 💥", err);
//   return res.status(err.statusCode).render("error", {
//     title: err,
//     msg: err.message,
//   });
// };

// const sendErrorProd = (err, req, res) => {
//   // A) API
//   if (req.originalUrl.startsWith("/api")) {
//     // A) Operational, trusted error: send message to client
//     if (err.isOperational) {
//       return res.status(err.statusCode).json({
//         status: err.status,
//         message: err.message,
//       });
//     }
//     // B) Programming or other unknown error: don't leak error details
//     // 1) Log error
//     console.error("ERROR 💥", err);
//     // 2) Send generic message
//     return res.status(500).json({
//       status: "error",
//       msg: err.message,
//     });
//   }

//   // B) RENDERED WEBSITE
//   // A) Operational, trusted error: send message to client
//   if (err.isOperational) {
//     return res.status(err.statusCode).render("error", {
//       title: err,
//       msg: err.message,
//     });
//   }
//   // B) Programming or other unknown error: don't leak error details
//   // 1) Log error
//   console.error("ERROR 💥", err);
//   // 2) Send generic message

//   return res.status(err.statusCode).render("error", {
//     title: err,
//     msg: err.message,
//   });
// };

// module.exports = (err, req, res, next) => {
//   // console.log(err.stack);

//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";

//   if (process.env.NODE_ENV === "production") {
//     if (err.code === 11000) err = handleDuplicateFieldsDB(err);

//     sendErrorDev(err, req, res);
//   } else if (process.env.NODE_ENV === "development") {
//     let error = { ...err };
//     error.message = err.message;

//     if (error.email === "CastError") error = handleCastErrorDB(error);
//     if (err.code === 11000) err = handleDuplicateFieldsDB(err);
//     if (error.email === "ValidationError")
//       error = handleValidationErrorDB(error);
//     if (error.email === "JsonWebTokenError") error = handleJWTError();
//     if (error.email === "TokenExpiredError") error = handleJWTExpiredError();

//     sendErrorProd(error, req, res);
//   }
// };


const AppError = require("./../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const valueMatch = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  const value = valueMatch ? valueMatch[0] : 'unknown value';

  const message = `${value.replace(/"/g, '')} is already taken. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);


const sendErrorDev = (err, res) => {
  if (res.headersSent) return;
  console.log(err, '---error---->>>> sendErrorDev---');

  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (res.headersSent) return;
  console.log(err, '---error---->>>> sendErrorProd---');

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  console.error("ERROR sssssss 💥", err);
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong!",
  });
};


module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    // Prevent double response
    if (res.headersSent) {
      console.warn("Headers already sent. Skipping error handler.");
      return;
    }

    let error = { ...err };
    error.message = err.message;

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError") error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    return sendErrorDev(error, res);
  } else if (process.env.NODE_ENV === "production") {
    // Prevent double response
    if (res.headersSent) {
      console.warn("Headers already sent. Skipping error handler.");
      return;
    }

    let error = { ...err };
    error.message = err.message;

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError") error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    return sendErrorProd(error, res);
  }
};