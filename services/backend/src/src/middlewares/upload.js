import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const today = new Date();
    const folder = path.join(
      uploadsRoot,
      String(today.getFullYear()),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    );
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(String(file.originalname || '')).toLowerCase();
    const name = `${crypto.randomUUID()}${ext}`;
    cb(null, name);
  }
});

const createUpload = ({ allowVideo = false } = {}) =>
  multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024 * 10 * 10
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
        return;
      }

      if (allowVideo && file.mimetype.startsWith('video/')) {
        cb(null, true);
        return;
      }

      cb(new Error(allowVideo ? 'فقط فایل تصویری یا ویدیویی مجاز است' : 'فقط فایل تصویری مجاز است'));
    }
  });

export const upload = createUpload();
export const uploadMedia = createUpload({ allowVideo: true });

export const uploadDocuments = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const selfValidationAllowedMimes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

export const uploadSelfValidation = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    if (selfValidationAllowedMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('فقط فایل تصویری، PDF یا Word مجاز است'));
  }
});
