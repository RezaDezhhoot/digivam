import express from 'express';
import path from 'node:path';
import { apiRouter } from './src/routes/index.js';
import { errorHandler } from './src/middlewares/error-handler.js';
import { corsMiddleware } from './src/middlewares/cors.js';
import { requestLogger } from './src/middlewares/request-logger.js';
import { loadMaintenanceSettings } from './src/services/site-settings.service.js';

const resolveMaintenancePanel = (req) => {
  const requestPath = String(req.path || '').toLowerCase();

  if (requestPath === '/status') {
    return String(req.query.panel || '').trim().toLowerCase();
  }

  if (requestPath.startsWith('/web')) {
    return 'web';
  }

  if (requestPath.startsWith('/customer')) {
    return 'customer';
  }

  if (requestPath.startsWith('/broker')) {
    return 'broker';
  }

  return '';
};

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'src', 'uploads')));
  app.use(corsMiddleware)
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'سالم' });
  });

  app.use('/api', async (req, res, next) => {
    try {
      const panel = resolveMaintenancePanel(req);
      if (!panel || !['web', 'customer', 'broker'].includes(panel)) {
        return next();
      }

      const maintenance = await loadMaintenanceSettings();
      if (!maintenance[panel]) {
        return next();
      }

      return res.status(503).json({
        maintenance: true,
        panel,
        message: maintenance.message || 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
};
