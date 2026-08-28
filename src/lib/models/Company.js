import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    tin: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      default: 'Addis Ababa',
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    logoUrl: {
      type: String,
      trim: true,
    },

    pensionScheme: {
      type: String,
      enum: ['private', 'government'],
      default: 'private',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company ||
  mongoose.model('Company', companySchema);