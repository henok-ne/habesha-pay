import mongoose from 'mongoose';

const offerLetterSchema = new mongoose.Schema(
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
      index: true,
    },

    candidateName: {
      type: String,
      required: true,
      trim: true,
    },

    position: {
      type: String,
      required: true,
      trim: true,
    },

    salary: {
      type: Number,
      min: 0,
    },

    startDate: Date,

    content: {
      type: String,
    },

    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected'],
      default: 'draft',
    },

    sentAt: Date,

    acceptedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.OfferLetter ||
  mongoose.model('OfferLetter', offerLetterSchema);