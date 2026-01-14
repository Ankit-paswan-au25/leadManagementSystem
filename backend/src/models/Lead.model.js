const mongoose = require('mongoose');
const { LEAD_STATUS, LEAD_SOURCE } = require('../core/leadEnums');

const leadSchema = new mongoose.Schema(
  {
    // Identity
    leadName: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },

    // Ownership
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },

    // Status & Source
    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.NEW,
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(LEAD_SOURCE),
      default: LEAD_SOURCE.MANUAL,
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },

    // Scheduling Intelligence (placeholder for future)
    nextFollowUpAt: {
      type: Date,
    },
    frequencyRule: {
      type: mongoose.Schema.Types.Mixed, // Flexible object for future rules
    },

    // Metadata
    lastContactedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for performance
leadSchema.index({ ownerId: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ nextFollowUpAt: 1 }); // For scheduler queries
leadSchema.index({ productId: 1 });

// Prevent deletion (soft delete will be implemented later)
// Note: 'remove' hook is deprecated in newer Mongoose, but kept for compatibility
leadSchema.pre('remove', function (next) {
  next(new Error('Lead deletion is not allowed. Use status update instead.'));
});

// Prevent deletion via document.deleteOne() (instance method)
leadSchema.methods.deleteOne = function() {
  return Promise.reject(new Error('Lead deletion is not allowed. Use status update instead.'));
};

// Prevent deletion via findOneAndDelete, findByIdAndDelete, etc. (static methods)
leadSchema.pre(['findOneAndDelete', 'findByIdAndDelete', 'deleteOne', 'deleteMany'], function (next) {
  next(new Error('Lead deletion is not allowed. Use status update instead.'));
});

// Virtual for current owner (populated)
leadSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for creator (populated)
leadSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included in JSON
leadSchema.set('toJSON', {
  virtuals: true,
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;

