import { Router } from 'express';

import projectRouter from './projects';
import userRouter from './users';

// Export the base-router
const baseRouter = Router();
baseRouter.use('/users', userRouter);
baseRouter.use('/projects', projectRouter);
export default baseRouter;
