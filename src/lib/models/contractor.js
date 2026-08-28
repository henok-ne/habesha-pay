import mongoose from 'mongoose';

const contractorSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    contractorCode: {
      type: String,
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

    serviceDescription: {
      type: String,
      trim: true,
    },

    monthlyAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    startDate: Date,

    endDate: Date,

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

contractorSchema.index({
  companyId: 1,
  contractorCode: 1,
});

export default mongoose.models.Contractor ||
  mongoose.model('Contractor', contractorSchema);