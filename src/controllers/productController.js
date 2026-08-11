const mongoose = require('mongoose');
const Product = require('../models/Product');


const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock,
      createdBy: req.admin._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, page, limit, sortBy, sortOrder } = req.query;

    const filter = {};

    if (search) {
      // case-insensitive partial match on name
      filter.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};


const getProductSummary = async (req, res) => {
  try {
    const [summary] = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] },
          },
          averagePrice: { $avg: '$price' },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          totalStock: 1,
          outOfStockCount: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Product summary fetched successfully',
      data: summary || { totalProducts: 0, totalStock: 0, outOfStockCount: 0, averagePrice: 0 },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product summary' });
  }
};


const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};


const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};


const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { id: req.params.id },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};


const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id format' });
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: id,
     
        $expr: { $gte: [{ $add: ['$stock', quantity] }, 0] },
      },
      { $inc: { stock: quantity } },
      { new: true }
    );

    if (updated) {
      return res.status(200).json({
        success: true,
        message: `Stock ${quantity > 0 ? 'increased' : 'decreased'} successfully`,
        data: updated,
      });
    }

   
    const exists = await Product.findById(id).select('stock');
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(400).json({
      success: false,
      message: `Insufficient stock. Current stock is ${exists.stock}, cannot decrease by ${Math.abs(quantity)}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update stock' });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductSummary,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
};
