import { Router } from 'express';
import { sendData } from '../utils/apiResponse';
import { authRouter } from './auth.routes';
import { accountRouter } from './account.routes';
import { contactRouter } from './contact.routes';
import { dealRouter } from './deal.routes';
import { productRouter } from './product.routes';
import { taxRateRouter } from './taxRate.routes';
import { quoteRouter } from './quote.routes';
import { publicRouter } from './public.routes';
import { salesOrderRouter } from './salesOrder.routes';
import { invoiceRouter } from './invoice.routes';

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
apiRouter.use('/tax-rates', taxRateRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/quotes', quoteRouter);
apiRouter.use('/sales-orders', salesOrderRouter);
apiRouter.use('/invoices', invoiceRouter);
apiRouter.use('/public', publicRouter); // unauthenticated, token-gated
// apiRouter.use('/users', usersRouter);
// apiRouter.use('/accounts', accountsRouter);
// ...
