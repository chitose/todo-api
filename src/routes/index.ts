import { Router } from 'express';

import labelRouter from './label';
import projectRouter, { ProjectRouteUrlBuilder } from './projects';
import userRouter from './users';
import { getTodayTasks, getUpcommingTasks, search, tasksByLabel, ViewRouteUrlBuilder } from './view';

// Export the base-router
const baseRouter = Router();
baseRouter.use('/users', userRouter);
baseRouter.use(new ProjectRouteUrlBuilder().base, projectRouter);
baseRouter.use('/labels/', labelRouter);
const viewUrlBuilder = new ViewRouteUrlBuilder();

baseRouter.get(viewUrlBuilder.today(), getTodayTasks);
baseRouter.get(viewUrlBuilder.upcomming(), getUpcommingTasks);
baseRouter.get(viewUrlBuilder.search(), search);
baseRouter.get(viewUrlBuilder.tasksByLabel(), tasksByLabel);
export default baseRouter;
