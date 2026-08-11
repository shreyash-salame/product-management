
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};


const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = 500;
  let message = 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource id';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value, record already exists';
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
