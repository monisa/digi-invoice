import { Router } from 'express';
import { sendData } from '../utils/apiResponse';

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
// apiRouter.use('/auth', authRouter);
// apiRouter.use('/users', usersRouter);
// apiRouter.use('/accounts', accountsRouter);
// ...
