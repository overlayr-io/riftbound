import multer from 'multer'

const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/png']
const MAX_SIZE_BYTES = 6 * 1024 * 1024 // 6 Mo

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Type de fichier non supporté (webp, jpeg, png uniquement)'))
  },
}).single('file')
