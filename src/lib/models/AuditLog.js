import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    entity: {
      type: String,
      trim: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
    },

    ipAddress: String,

    userAgent: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);