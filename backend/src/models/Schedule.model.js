const mongoose = require('mongoose');
const { FREQUENCY_TYPE } = require('../core/scheduleEnums');

const scheduleSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead ID is required'],
      unique: true, // One active schedule per lead
      index: true,
    },
    frequencyType: {
      type: String,
      enum: Object.values(FREQUENCY_TYPE),
      default: FREQUENCY_TYPE.CUSTOM,
      required: true,
    },
    frequencyValue: {
      type: Number,
      // For CUSTOM: number of days
      // For DAILY: not used (always 1 day)
      // For WEEKLY: not used (always 7 days)
      default: 3, // Default: every 3 days
    },
    nextRunAt: {
      type: Date,
      required: [true, 'Next run time is required'],
      index: true, // Indexed for efficient scheduler queries
    },
    active: {
      type: Boolean,
      default: true,
      index: true, // Indexed for efficient scheduler queries
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound index for scheduler queries (active + nextRunAt)
scheduleSchema.index({ active: 1, nextRunAt: 1 });

// Prevent deletion (only pause/resume allowed)
scheduleSchema.pre(['findOneAndDelete', 'findByIdAndDelete', 'deleteOne', 'deleteMany'], function (next) {
  next(new Error('Schedule deletion is not allowed. Use pause/resume instead.'));
});

// Virtual for lead (populated)
scheduleSchema.virtual('lead', {
  ref: 'Lead',
  localField: 'leadId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included in JSON
scheduleSchema.set('toJSON', {
  virtuals: true,
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;

