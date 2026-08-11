const Joi = require('joi');

// MongoDB ObjectId pattern
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid product id format');

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Product name must not be empty',
  }),
  description: Joi.string().trim().allow('').max(2000).default(''),
  price: Joi.number().greater(0).required().messages({
    'number.greater': 'Price must be greater than zero',
  }),
  category: Joi.string().trim().min(1).max(100).required(),
  stock: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Stock must not be negative',
  }),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().allow('').max(2000),
  price: Joi.number().greater(0).messages({
    'number.greater': 'Price must be greater than zero',
  }),
  category: Joi.string().trim().min(1).max(100),
  stock: Joi.number().integer().min(0),
})
  .min(1)
  .messages({ 'object.min': 'At least one field must be provided to update' });


const stockAdjustSchema = Joi.object({
  quantity: Joi.number().integer().invalid(0).required().messages({
    'any.invalid': 'Quantity must not be zero',
    'any.required': 'Quantity is required',
  }),
});

const productIdParamSchema = Joi.object({
  id: objectId.required(),
});

const listProductsQuerySchema = Joi.object({
  search: Joi.string().trim().max(200).allow(''),
  category: Joi.string().trim().max(100).allow(''),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('name', 'price', 'stock', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
}).custom((value, helpers) => {
  if (
    value.minPrice !== undefined &&
    value.maxPrice !== undefined &&
    value.minPrice > value.maxPrice
  ) {
    return helpers.message('minPrice cannot be greater than maxPrice');
  }
  return value;
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  stockAdjustSchema,
  productIdParamSchema,
  listProductsQuerySchema,
};
