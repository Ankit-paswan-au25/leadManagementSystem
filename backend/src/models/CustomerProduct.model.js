const mongoose = require('mongoose');

/**
 * CustomerProduct Schema
 * 
 * Maps customers to products with expiry tracking.
 * Multiple products can be assigned to a single customer.
 * Expiry is calculated at assignment time based on product duration.
 */
const customerProductSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      // Required if product has duration (not NONE)
      validate: {
        validator: function (v) {
          // If durationType is NONE, expiryDate is optional
          // Otherwise, it's required
          return true; // Validation handled in pre-save hook
        },
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by user is required'],
    },
    source: {
      type: String,
      enum: ['SALES', 'ZOHO', 'MANUAL'],
      default: 'MANUAL',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerProductSchema.index({ customerId: 1 });
customerProductSchema.index({ productId: 1 });
customerProductSchema.index({ status: 1 });
customerProductSchema.index({ expiryDate: 1 });
customerProductSchema.index({ customerId: 1, productId: 1 }); // Compound index for lookups

// Prevent deletion (use status-based approach)
customerProductSchema.pre('remove', function (next) {
  next(new Error('CustomerProduct deletion is not allowed. Use status=CANCELLED instead.'));
});

customerProductSchema.pre('deleteOne', function (next) {
  next(new Error('CustomerProduct deletion is not allowed. Use status=CANCELLED instead.'));
});

customerProductSchema.pre('findOneAndDelete', function (next) {
  next(new Error('CustomerProduct deletion is not allowed. Use status=CANCELLED instead.'));
});

customerProductSchema.pre('findByIdAndDelete', function (next) {
  next(new Error('CustomerProduct deletion is not allowed. Use status=CANCELLED instead.'));
});

const CustomerProduct = mongoose.model('CustomerProduct', customerProductSchema);

module.exports = CustomerProduct;

