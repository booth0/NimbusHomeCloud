import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
      },
    ],
  },
  { timestamps: true }
);

export const Collection = mongoose.model('Collection', collectionSchema);
