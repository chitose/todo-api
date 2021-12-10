import { Router } from 'express';

import projectRouter, { ProjectRouteUrlBuilder } from './projects';
import userRouter from './users';

// Export the base-router
const baseRouter = Router();
baseRouter.use('/users', userRouter);
baseRouter.use(new ProjectRouteUrlBuilder().base, projectRouter);
export default baseRouter;
