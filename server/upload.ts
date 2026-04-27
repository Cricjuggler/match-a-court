import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';

const uploadsDir = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    cb(null, ok);
  },
});

/** Public upload endpoint — returns { url } */
export const uploadRouter = Router();

uploadRouter.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No valid image file (jpg/png/webp, max 5MB)' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});
