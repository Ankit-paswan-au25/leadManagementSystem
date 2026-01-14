/**
 * Seed Products Script
 * Creates default products for the system
 * 
 * Usage: node src/scripts/seedProducts.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const config = require('../config/env');
const logger = require('../config/logger');

const productsToSeed = [
  {
    productName: 'ProDMARC',
    productCode: 'PRODMARC',
    description: 'DMARC email authentication and protection product',
    category: 'Security',
    durationType: 'YEARS',
    defaultDuration: 1,
    isActive: true,
  },
  {
    productName: 'ProPhish',
    productCode: 'PROPHISH',
    description: 'Phishing protection and email security product',
    category: 'Security',
    durationType: 'YEARS',
    defaultDuration: 1,
    isActive: true,
  },
  {
    productName: 'ProAuditor',
    productCode: 'PROAUDITOR',
    description: 'Security auditing and compliance product',
    category: 'Security',
    durationType: 'YEARS',
    defaultDuration: 1,
    isActive: true,
  },
  {
    productName: 'ProLMS',
    productCode: 'PROLMS',
    description: 'Learning Management System product',
    category: 'Education',
    durationType: 'YEARS',
    defaultDuration: 1,
    isActive: true,
  },
];

async function seedProducts() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await mongoose.connect(config.mongoUri);
    logger.info('Database connected successfully');

    // Seed products
    const createdProducts = [];
    const skippedProducts = [];

    for (const productData of productsToSeed) {
      try {
        // Check if product already exists
        const existingProduct = await Product.findOne({ productCode: productData.productCode });
        
        if (existingProduct) {
          logger.info(`Product ${productData.productCode} already exists. Skipping...`);
          skippedProducts.push(productData.productCode);
          
          // Update product if CLEAR_PRODUCTS is set
          if (process.env.CLEAR_PRODUCTS === 'true') {
            existingProduct.productName = productData.productName;
            existingProduct.description = productData.description;
            existingProduct.category = productData.category;
            existingProduct.durationType = productData.durationType;
            existingProduct.defaultDuration = productData.defaultDuration;
            existingProduct.isActive = productData.isActive;
            await existingProduct.save();
            logger.info(`Updated product ${productData.productCode}`);
          }
        } else {
          // Create new product
          const product = new Product(productData);
          await product.save();
          createdProducts.push(product);
          logger.info(`✓ Created product: ${product.productName} (${product.productCode})`);
        }
      } catch (error) {
        logger.error(`Error creating product ${productData.productCode}:`, error.message);
      }
    }

    logger.info(`\n✓ Product seeding completed successfully!`);
    logger.info(`Created ${createdProducts.length} products`);
    if (skippedProducts.length > 0) {
      logger.info(`Skipped ${skippedProducts.length} existing products`);
    }
    
    // Display summary
    console.log('\n=== Seeded Products ===');
    productsToSeed.forEach((product) => {
      const status = skippedProducts.includes(product.productCode) ? '(Already exists)' : '✓ Created';
      console.log(`${status} - ${product.productName} (${product.productCode})`);
      console.log(`  Category: ${product.category}`);
      console.log(`  Duration: ${product.defaultDuration} ${product.durationType}`);
      console.log('---');
    });

    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding products:', error);
    console.error('Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run seed function
seedProducts();

