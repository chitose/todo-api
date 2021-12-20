/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IProjectCreationAttributes, IUserAttribute } from '@daos/models';
import { getProjectRepository } from '@daos/repositories';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';
import {
    createSection,
    deleteSection,
    duplicateSection,
    getSection,
    getSections,
    swapSectionOrder,
    updateSection,
} from './sections';
import {
    assignTask,
    completeTask,
    createTask,
    deleteTask,
    duplicateTask,
    getTask,
    getTasks,
    moveTask,
    setTaskDueDate,
    setTaskPriority,
    swapTaskOrder,
    updateTask,
} from './tasks';

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

    public getSections(projectId?: number | string) {
        return `${this.getProjectById(projectId)}/section`;
    }

    public getSection(projectId?: number | string, sectId?: number | string) {
        return `${this.getProjectById(projectId)}/section/${sectId ? sectId : ':' + RouteParams.SectionId}`;
    }

    public updateSection(projId?: string | number, sectionId?: string | number) {
        return this.getSection(projId, sectionId);
    }

    public deleteSection(projId?: string | number, sectionId?: string | number) {
        return this.updateSection(projId, sectionId);
    }

    public duplicateSection(projId?: string | number, sectionId?: string | number) {
        return `${this.updateSection(projId, sectionId)}/duplicate`;
    }

    public swapSectionOrder(projectId?: number | string, sourceSectId?: number | string, targetSectId?: number | string): string {
        return `${this.getSection(projectId, sourceSectId)}/swap/${targetSectId ? targetSectId : ':' + RouteParams.TargetSectionId}`;
    }

    public createTask(projId?: string | number) {
        return `${this.getProjectById(projId)}/task`;
    }

    public createSectionTask(projId?: string | number, sectionId?: string | number) {
        return `${this.updateSection(projId, sectionId)}/task`;
    }


    public getTasks(projId?: number | string) {
        return `${this.getProjectById(projId)}/tasks`;
    }

    public getTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getProjectById(projectId)}/task/${(taskId ? taskId : ':' + RouteParams.TaskId)}`;
    }

    public duplicateTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/duplicate`;
    }

    public swapTaskOrder(projectId?: number | string, taskId?: number | string, targetTaskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/swapOrder/${targetTaskId ? targetTaskId : ':' + RouteParams.TargetTaskId}`;
    }

    public deleteTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}`;
    }

    public assignTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/assignTask`;
    }

    public updateTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/update`;
    }

    public completeTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/complete`;
    }

    public setTaskDueDate(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/duedate`;
    }

    public setTaskPriority(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/priority`;
    }
    public moveTask(projectId?: number | string, taskId?: number | string, targetProjectId?: number | string) {
        return `${this.getTask(projectId, taskId)}/move/${targetProjectId ? targetProjectId : ':' + RouteParams.TargetProjectId}`;
    }

    public moveTaskToSection(projectId?: number | string, taskId?: number | string, targetProjectId?: number | string, sectId?: number | string) {
        return `${this.moveTask(projectId, taskId, targetProjectId)}/${sectId ? sectId : ':' + RouteParams.TargetSectionId}`;
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
projectRouter.get(projectRoutes.getSection(), getSection);
projectRouter.get(projectRoutes.getSections(), getSections);
projectRouter.post(projectRoutes.swapSectionOrder(), swapSectionOrder);
projectRouter.put(projectRoutes.createSection(), createSection);
projectRouter.post(projectRoutes.updateSection(), updateSection);
projectRouter.delete(projectRoutes.deleteSection(), deleteSection);
projectRouter.post(projectRoutes.duplicateSection(), duplicateSection);


// task
projectRouter.put(projectRoutes.createTask(), createTask);
projectRouter.put(projectRoutes.createSectionTask(), createTask);
projectRouter.get(projectRoutes.getTasks(), getTasks);
projectRouter.get(projectRoutes.getTask(), getTask);
projectRouter.post(projectRoutes.duplicateTask(), duplicateTask);
projectRouter.post(projectRoutes.moveTask(), moveTask);
projectRouter.post(projectRoutes.moveTaskToSection(), moveTask);
projectRouter.post(projectRoutes.swapTaskOrder(), swapTaskOrder);
projectRouter.post(projectRoutes.setTaskPriority(), setTaskPriority);
projectRouter.post(projectRoutes.setTaskDueDate(), setTaskDueDate);
projectRouter.post(projectRoutes.completeTask(), completeTask);
projectRouter.post(projectRoutes.updateTask(), updateTask);
projectRouter.delete(projectRoutes.deleteTask(), deleteTask);
projectRouter.post(projectRoutes.assignTask(), assignTask);

export default projectRouter;