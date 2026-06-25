import { Router } from 'express';
import { sendData } from '../utils/apiResponse';
import { authRouter } from './auth.routes';
import { accountRouter } from './account.routes';
import { contactRouter } from './contact.routes';
import { dealRouter } from './deal.routes';

/**
 * API v1 root router. Resource routers (auth, users, accounts, quotes, ...)
 * are mounted here in subsequent build slices.
 */
export const apiRouter = Router();

// Liveness/readiness probe — unauthenticated.
apiRouter.get('/health', (_req, res) => {
  sendData(res, { status: 'ok', time: new Date().toISOString() });
});

// --- Resource routers (added per slice) -------------------------------------
apiRouter.use('/auth', authRouter);
apiRouter.use('/accounts', accountRouter);
apiRouter.use('/contacts', contactRouter);
apiRouter.use('/deals', dealRouter);
// apiRouter.use('/users', usersRouter);
// apiRouter.use('/accounts', accountsRouter);
// ...
