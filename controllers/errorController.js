const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const [errorField, errorValue] = Object.entries(err.keyValue).flat();
  const message = `Duplicate '${errorField}' value entered: '${errorValue}'.`;
  return new AppError(message, 400);
};

const handleValidationErrDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Your request ecountered the following errors: ${errors.join(
    ', '
  )}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token, please login', 401);
const handleJWTExpiredError = () =>
  new AppError('Your token has expired, please login again', 401);

const sendDevError = (err, req, res) => {
  // NOTES check if the url is an api url and send api error
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // NOTES otherwise send a rendered web error

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    message: err.message,
  });
};

const sendProdError = (err, req, res) => {
  // API error
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    if (!err.isOperational) {
      return res.status(500).json({
        title: 'Something went wrong',
        message: err.message,
      });
    }
  }

  // rendered web error
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      status: err.status,
      message: err.message,
    });
  }
  if (!err.isOperational) {
    return res.status(500).render('error', {
      title: 'Something went wrong!',
      message: 'Please try again later',
    });
  }
};

module.exports = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'Error';
  // error.isOperational = err.isOperational || false;

  if (process.env.NODE_ENV === 'development') {
    sendDevError(error, req, res);
  }
  if (process.env.NODE_ENV === 'production') {
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);
    sendProdError(error, req, res);
  }
};
