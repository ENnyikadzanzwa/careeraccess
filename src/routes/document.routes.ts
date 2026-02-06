import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { config } from '../config';
import { logAudit } from '../utils/audit';

const router = Router();

// Configure multer
const uploadDir = config.upload.dir;
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

// Upload document
router.post('/', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { type } = req.body;
    const validTypes = [
      'O_LEVEL_CERTIFICATE', 'A_LEVEL_CERTIFICATE', 'NATIONAL_ID',
      'BIRTH_CERTIFICATE', 'PASSPORT_PHOTO', 'TRANSCRIPT',
      'RECOMMENDATION_LETTER', 'PERSONAL_STATEMENT', 'PROOF_OF_PAYMENT', 'OTHER',
    ];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid document type' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        userId: req.user!.userId,
        type,
        fileName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'UPLOAD_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
      details: { type, fileName: req.file.originalname },
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// List user documents
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await prisma.document.delete({ where: { id: document.id } });

    await logAudit({
      userId: req.user!.userId,
      action: 'DELETE_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
    });

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
