import mongoose from 'mongoose';

const overtimeEntrySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
    },

    hours: {
      type: Number,
      required: true,
      min: 0,
    },

    rate: {
      type: Number,
      default: 1,
      min: 0,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    reason: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.OvertimeEntry ||
  mongoose.model('OvertimeEntry', overtimeEntrySchema);