const mongoose = require('mongoose');
const { ACTIVITY_TYPE } = require('../core/leadEnums');

/**
 * LeadActivity Schema
 * 
 * Immutable audit trail for all lead-related actions.
 * Tracks:
 * - What happened (activityType)
 * - Who did it (performedBy)
 * - When it happened (timestamp)
 * - Owner at that time (ownerAtTime - for accountability)
 * - What changed (metadata)
 * 
 * This is the source of truth for lead history.
 */
const leadActivitySchema = new mongoose.Schema(
  {
    // Reference to the lead
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead ID is required'],
      index: true,
    },

    // Activity details
    activityType: {
      type: String,
      enum: Object.values(ACTIVITY_TYPE),
      required: [true, 'Activity type is required'],
      index: true,
    },

    // Who performed this action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performer is required'],
    },

    // Owner at the time of this activity (for accountability)
    ownerAtTime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner at time is required'],
    },

    // Activity metadata (flexible object for different activity types)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Optional description/notes
    description: {
      type: String,
      trim: true,
    },

    // Timestamp (immutable)
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false, // We use custom timestamp field
  }
);

// Indexes for efficient queries
leadActivitySchema.index({ leadId: 1, timestamp: -1 }); // Get activities for a lead, newest first
leadActivitySchema.index({ performedBy: 1, timestamp: -1 }); // Get activities by user
leadActivitySchema.index({ ownerAtTime: 1, timestamp: -1 }); // Get activities by owner at time
leadActivitySchema.index({ activityType: 1, timestamp: -1 }); // Get activities by type

// Prevent any modifications (immutable audit trail)
leadActivitySchema.pre('save', function (next) {
  // If this is an update (not a new document), prevent it
  if (!this.isNew) {
    return next(new Error('LeadActivity records are immutable and cannot be modified'));
  }
  next();
});

// Prevent deletion via document.deleteOne() (instance method)
leadActivitySchema.methods.deleteOne = function() {
  return Promise.reject(new Error('LeadActivity records are immutable and cannot be deleted'));
};

leadActivitySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  next(new Error('LeadActivity records are immutable and cannot be updated'));
});

leadActivitySchema.pre(['findOneAndDelete', 'findByIdAndDelete', 'deleteOne', 'deleteMany'], function (next) {
  next(new Error('LeadActivity records are immutable and cannot be deleted'));
});

// Virtual for performer (populated)
leadActivitySchema.virtual('performer', {
  ref: 'User',
  localField: 'performedBy',
  foreignField: '_id',
  justOne: true,
});

// Virtual for owner at time (populated)
leadActivitySchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerAtTime',
  foreignField: '_id',
  justOne: true,
});

// Virtual for lead (populated)
leadActivitySchema.virtual('lead', {
  ref: 'Lead',
  localField: 'leadId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included in JSON
leadActivitySchema.set('toJSON', {
  virtuals: true,
});

const LeadActivity = mongoose.model('LeadActivity', leadActivitySchema);

module.exports = LeadActivity;

