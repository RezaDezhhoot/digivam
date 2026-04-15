import fs from 'node:fs';
import path from 'node:path';
import { File } from '../models/file.model.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

export const downloadFileById = async (req, res, next) => {
  try {
    const file = await File.findByPk(Number(req.params.id || 0));

    if (!file) {
      return res.status(404).json({ message: 'فایل یافت نشد' });
    }

    const rawPath = String(file.path || '').trim();
    if (!rawPath) {
      return res.status(404).json({ message: 'مسیر فایل نامعتبر است' });
    }

    if (/^https?:\/\//i.test(rawPath)) {
      return res.redirect(rawPath);
    }

    const absolutePath = path.resolve(uploadsRoot, rawPath);
    if (!absolutePath.startsWith(uploadsRoot)) {
      return res.status(403).json({ message: 'دسترسی به فایل مجاز نیست' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'فایل روی سرور یافت نشد' });
    }

    const fileName = String(file.data?.originalName || file.data?.title || file.subject || `file-${file.id}`).trim() || `file-${file.id}`;
    return res.download(absolutePath, fileName);
  } catch (error) {
    return next(error);
  }
};