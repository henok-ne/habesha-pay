import mongoose from 'mongoose';

const payrollRunSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    periodYear: {
      type: Number,
      required: true,
    },

    periodMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    status: {
      type: String,
      enum: ['draft', 'processing', 'completed', 'approved', 'cancelled'],
      default: 'draft',
    },

    totalGross: {
      type: Number,
      default: 0,
    },

    totalTax: {
      type: Number,
      default: 0,
    },

    totalPension: {
      type: Number,
      default: 0,
    },

    totalNet: {
      type: Number,
      default: 0,
    },

    employeeCount: {
      type: Number,
      default: 0,
    },

    processedAt: Date,

    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

payrollRunSchema.index(
  {
    companyId: 1,
    periodYear: 1,
    periodMonth: 1,
  },
  { unique: true }
);

export default mongoose.models.PayrollRun ||
  mongoose.model('PayrollRun', payrollRunSchema);