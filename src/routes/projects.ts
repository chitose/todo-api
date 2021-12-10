/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IProjectCreationAttributes, IUserAttribute } from '@daos/models';
import { getProjectRepository } from '@daos/repositories';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';
import { createSection, deleteSection, duplicateSection, updateSection } from './sections';
import { createSectionTask, createTask } from './tasks';

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
    const projectId = req.params[RouteParams.ProjectId];
    const user = req.user as IUserAttribute;
    const proj = await repo.get(user.id, Number(projectId));
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
    const projectId = req.params[RouteParams.ProjectId];
    const { users } = req.body as IShareProjectRequestBody;

    try {
        await repo.shareProject(user.id, Number(projectId), users);
        return res.status(StatusCodes.OK).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

async function deleteProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const projectId = req.params[RouteParams.ProjectId];
    try {
        await repo.deleteProject(user.id, Number(projectId));
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}


export class ProjectRouteUrlBuilder {
    public base = '/projects';

    constructor(private relativeOnly = true) {
    }

    public create(): string {
        return this.getUrl('/create');
    }

    public getUserProjects() {
        return this.getUrl('');
    }

    public getProjectById(id?: string | number) {
        return this.getUrl(`/${id || (':' + RouteParams.ProjectId)}`);
    }

    public shareProject(id?: string | number) {
        return `${this.getProjectById(id)}/share`;
    }

    public deleteProject(id?: string | number) {
        return this.getProjectById(id);
    }

    public createSection(id?: string | number) {
        return `${this.getProjectById(id)}/section`;
    }

    public updateSection(projId?: string | number, sectionId?: string | number) {
        return this.getUrl(`/${projId || (':' + RouteParams.ProjectId)}/section/${sectionId || (':' + RouteParams.SectionId)}`);
    }

    public deleteSection(projId?: string | number, sectionId?: string | number) {
        return this.updateSection(projId, sectionId);
    }

    public duplicateSection(projId?: string | number, sectionId?: string | number) {
        return `${this.updateSection(projId, sectionId)}/duplicate`;
    }

    public createTask(projId?: string | number) {
        return `${this.getProjectById(projId)}/task`;
    }

    public createSectionTask(projId?: string | number, sectionId?: string | number) {
        return `${this.updateSection(projId, sectionId)}/task`;
    }

    private getUrl(rel: string) {
        return this.relativeOnly ? rel : `/api${this.base}${rel}`;
    }
}

const projectRoutes = new ProjectRouteUrlBuilder();

// Project-route
const projectRouter = Router();
projectRouter.put(projectRoutes.create(), createProject);
projectRouter.get(projectRoutes.getUserProjects(), getUserProjects);
projectRouter.get(projectRoutes.getProjectById(), getProject);
projectRouter.post(projectRoutes.shareProject(), shareProject);
projectRouter.delete(projectRoutes.deleteProject(), deleteProject);

// section
projectRouter.put(projectRoutes.createSection(), createSection);
projectRouter.post(projectRoutes.updateSection(), updateSection);
projectRouter.delete(projectRoutes.deleteSection(), deleteSection);
projectRouter.post(projectRoutes.duplicateSection(), duplicateSection);

// task
projectRouter.put(projectRoutes.createTask(), createTask);
projectRouter.put(projectRoutes.createSectionTask(), createSectionTask);

export default projectRouter;