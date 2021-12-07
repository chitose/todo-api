import { IProjectCreationAttributes, IUserAttribute } from '@daos/models';
import { getProjectRepository } from '@daos/repositories';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

const repo = getProjectRepository();

async function createProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const proj = req.body as unknown as IProjectCreationAttributes;
    if (!proj.name) {
        return res.status(StatusCodes.PRECONDITION_REQUIRED)
            .send({ message: 'name is required.' });
    }
    const createdProj = await repo.createProject(proj, user);
    return res.status(StatusCodes.OK).json(createdProj);
}

async function getProject(req: Request, res: Response) {
    const {id} = req.params;    
    const proj = await repo.get(Number(id));
    return res.status(StatusCodes.OK).json(proj);
}

async function getUserProjects(req: Request, res: Response) {
    const user = req.user as IUserAttribute;    
    const projects = await repo.getUserProjects(user.id);
    return res.status(StatusCodes.OK).json(projects);
}

// Project-route
const projectRouter = Router();
projectRouter.post('/create', createProject);
projectRouter.get('/user', getUserProjects);
projectRouter.get('/:id', getProject);

export default projectRouter;