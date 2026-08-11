/**
 * Seed script: creates one admin and a handful of sample products.
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const Product = require('./models/Product');

const run = async () => {
  await connectDB();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

  let admin = await Admin.findOne({ email: adminEmail });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(adminPassword, salt);

    admin = await Admin.create({
      name: 'Default Admin',
      email: adminEmail,
      password: hashPassword,
    });
    console.log(`Created admin: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  await Product.deleteMany({});

  const sampleProducts = [
    {
      name: 'Wireless Mouse',
      description: 'Ergonomic 2.4GHz wireless mouse',
      price: 799,
      category: 'Electronics',
      stock: 50,
      createdBy: admin._id,
    },
    {
      name: 'Mechanical Keyboard',
      description: 'RGB backlit mechanical keyboard, blue switches',
      price: 2499,
      category: 'Electronics',
      stock: 25,
      createdBy: admin._id,
    },
    {
      name: 'Cotton T-Shirt',
      description: 'Plain round-neck cotton t-shirt',
      price: 399,
      category: 'Apparel',
      stock: 100,
      createdBy: admin._id,
    },
    {
      name: 'Denim Jeans',
      description: 'Slim fit denim jeans',
      price: 1499,
      category: 'Apparel',
      stock: 0,
      createdBy: admin._id,
    },
    {
      name: 'Stainless Steel Water Bottle',
      description: '1 litre insulated water bottle',
      price: 599,
      category: 'Home & Kitchen',
      stock: 40,
      createdBy: admin._id,
    },
  ];

  await Product.insertMany(sampleProducts);
  console.log(`Inserted ${sampleProducts.length} sample products`);

  await mongoose.disconnect();
  console.log('Seeding complete. Disconnected.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
