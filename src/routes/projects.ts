import { IProjectCreationAttributes, IUserAttribute } from '@daos/models';
import { getProjectRepository } from '@daos/repositories';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

/* eslint-disable @typescript-eslint/no-unsafe-return */

const repo = getProjectRepository();

async function createProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const proj = req.body as unknown as IProjectCreationAttributes;
    if (!proj.name) {
        return res.status(StatusCodes.PRECONDITION_REQUIRED)
            .send({ message: 'name is required.' });
    }
    const createdProj = await repo.createProject(user.id, proj);
    return res.status(StatusCodes.CREATED).json(createdProj);
}

async function getProject(req: Request, res: Response) {
    const { id } = req.params;
    const user = req.user as IUserAttribute;
    const proj = await repo.get(user.id, Number(id));
    return res.status(StatusCodes.OK).json(proj);
}

async function getUserProjects(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const projects = await repo.getUserProjects(user.id);
    return res.status(StatusCodes.OK).json(projects);
}

export interface IShareProjectRequestBody {
    users: string[];
}

async function shareProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { id } = req.params;
    const { users } = req.body as IShareProjectRequestBody;

    try {
        await repo.shareProject(user.id, Number(id), users);
        return res.status(StatusCodes.OK).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

async function deleteProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { id } = req.params;
    try {
        await repo.deleteProject(user.id, Number(id));
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

// Project-route
const projectRouter = Router();
projectRouter.post('/create', createProject);
projectRouter.get('/user', getUserProjects);
projectRouter.get('/:id', getProject);
projectRouter.post('/share/:id', shareProject);
projectRouter.delete('/:id', deleteProject);

export default projectRouter;