const mongoose = require('mongoose');

/**
 * Product Schema
 * 
 * Master data for products that can be assigned to customers.
 * Products define duration types and default durations for expiry calculation.
 */
const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    productCode: {
      type: String,
      required: [true, 'Product code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    durationType: {
      type: String,
      enum: ['DAYS', 'MONTHS', 'YEARS', 'NONE'],
      required: [true, 'Duration type is required'],
      default: 'NONE',
    },
    defaultDuration: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ productCode: 1 }, { unique: true });
productSchema.index({ isActive: 1 });
productSchema.index({ category: 1 });

// Prevent deletion (soft-disable via isActive)
productSchema.pre('remove', function (next) {
  next(new Error('Product deletion is not allowed. Use isActive=false instead.'));
});

productSchema.pre('deleteOne', function (next) {
  next(new Error('Product deletion is not allowed. Use isActive=false instead.'));
});

productSchema.pre('findOneAndDelete', function (next) {
  next(new Error('Product deletion is not allowed. Use isActive=false instead.'));
});

productSchema.pre('findByIdAndDelete', function (next) {
  next(new Error('Product deletion is not allowed. Use isActive=false instead.'));
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

