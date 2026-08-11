const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be greater than zero'],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true } 
);



productSchema.index({ name: 'text' });

productSchema.index({ category: 1 });

productSchema.index({ price: 1 });

productSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
