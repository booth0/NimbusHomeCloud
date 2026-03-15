import mongoose from 'mongoose';

const ShareLinkSchema = new mongoose.Schema(
  {
    fileId:     { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
    jti:        { type: String, required: true, unique: true }, // UUID embedded in the JWT
    token:      { type: String, required: true },               // full JWT string
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt:  { type: Date, required: true },
    active:     { type: Boolean, default: true },
    type:       { type: String, enum: ['public'], default: 'public' },
  },
  { timestamps: true }
);

ShareLinkSchema.index({ fileId: 1 });

export const ShareLink = mongoose.model('ShareLink', ShareLinkSchema);