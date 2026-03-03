import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    filename:     { type: String, required: true },  // UUID-based name stored on disk
    originalName: { type: String, required: true },  // original filename from the upload
    owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    size:         { type: Number, required: true },  // bytes
    mimetype:     { type: String, required: true },
    path:         { type: String, required: true },  // absolute path on disk
  },
  { timestamps: true }
);

export const File = mongoose.model('File', fileSchema);
