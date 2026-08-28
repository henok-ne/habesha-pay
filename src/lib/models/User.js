import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    role: {
      type: String,
      enum: ['admin', 'hr', 'finance', 'viewer'],
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User ||
  mongoose.model('User', userSchema);