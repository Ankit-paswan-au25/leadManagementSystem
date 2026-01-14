const mongoose = require('mongoose');

/**
 * Customer Schema
 * 
 * Represents a converted lead that has become a customer.
 * One customer per lead (1:1 relationship via convertedFromLeadId).
 */
const customerSchema = new mongoose.Schema(
  {
    // Identity
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    primaryEmail: {
      type: String,
      required: [true, 'Primary email is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format',
      },
    },
    phone: {
      type: String,
      trim: true,
    },

    // Relationship
    convertedFromLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead ID is required'],
      unique: true, // One customer per lead
    },
    accountOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account owner is required'],
    },

    // Status
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'CHURNED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerSchema.index({ convertedFromLeadId: 1 }, { unique: true });
customerSchema.index({ accountOwnerId: 1 });
customerSchema.index({ primaryEmail: 1 });
customerSchema.index({ status: 1 });

// Prevent deletion
customerSchema.pre('remove', function (next) {
  next(new Error('Customer deletion is not allowed. Use status change instead.'));
});

customerSchema.pre('deleteOne', function (next) {
  next(new Error('Customer deletion is not allowed. Use status change instead.'));
});

customerSchema.pre('findOneAndDelete', function (next) {
  next(new Error('Customer deletion is not allowed. Use status change instead.'));
});

customerSchema.pre('findByIdAndDelete', function (next) {
  next(new Error('Customer deletion is not allowed. Use status change instead.'));
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;

