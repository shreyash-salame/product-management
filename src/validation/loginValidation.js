const Joi = require("joi");

const registrationValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(120),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6),
    role: Joi.string().valid("admin").default("admin"),
  });
  return schema.validate(data);
};

const loginUserValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  return schema.validate(data);
};

module.exports = {
  registrationValidation,
  loginUserValidation,
};
