
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,   
    stripUnknown: true,  
  });

  if (error) {
    const details = error.details.map((d) => d.message.replace(/"/g, ''));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details,
    });
  }

  req[source] = value;
  next();
};

module.exports = validate;
