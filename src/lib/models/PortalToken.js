import mongoose from 'mongoose';

const portalTokenSchema = new mongoose.Schema(
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

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    usedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PortalToken ||
  mongoose.model('PortalToken', portalTokenSchema);