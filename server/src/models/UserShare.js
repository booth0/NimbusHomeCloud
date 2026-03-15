import mongoose from 'mongoose';

const userShareSchema = new mongoose.Schema(
  {
    fileId:     { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
    sharedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Prevent sharing the same file with the same user twice
userShareSchema.index({ fileId: 1, sharedWith: 1 }, { unique: true });

// Fast lookup for "shared with me" queries
userShareSchema.index({ sharedWith: 1 });

export const UserShare = mongoose.model('UserShare', userShareSchema);
