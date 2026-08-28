import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    tin: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    employmentType: {
      type: String,
      trim: true,
    },

    startDate: Date,

    endDate: Date,

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    transportAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    housingAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    bankName: {
      type: String,
      trim: true,
    },

    bankAccount: {
      type: String,
      trim: true,
    },

    pensionNumber: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index(
  { companyId: 1, employeeCode: 1 },
  { unique: true }
);

export default mongoose.models.Employee ||
  mongoose.model('Employee', employeeSchema);