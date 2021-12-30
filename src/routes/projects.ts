import { IProjectCreationAttributes, IUserAttribute, ViewType } from '@daos/models';
import { getProjectRepository } from '@daos/repositories';
import { getKey } from '@shared/utils';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { addProjectComment, addTaskComment, getProjectComments, getTaskComments } from './comment';
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

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */

const repo = getProjectRepository();

/**
 * Error response
 * @typedef {object} ErrorResponse
 * @property {string} message - The error message.
 */

/**
 * PUT /api/projects
 * @summary Create a new project.
 * @param {ProjectCreation} request.body.required - project info
 * @return {Project} 201 - success response
 * @return {ErrorResponse} 428 - Validation error response
 * @security jwt
 */
async function createProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { defaultInbox, ...proj } = req.body as IProjectCreationAttributes;
    if (!proj.name) {
        return res.status(StatusCodes.PRECONDITION_REQUIRED)
            .send({ message: 'name is required.' });
    }
    if (proj.view === undefined) {
        return res.status(StatusCodes.PRECONDITION_REQUIRED)
            .send({ message: 'view is required.' });
    }
    if (proj.view !== ViewType.List && proj.view !== ViewType.Dashboard) {
        return res.status(StatusCodes.PRECONDITION_REQUIRED)
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            .send({ message: `${proj.view} is not valid view type.` });
    }
    const createdProj = await repo.createProject(user.id, proj);
    return res.status(StatusCodes.CREATED).json(createdProj);
}

/**
 * GET /api/projects/{id}
 * @summary Get project by id
 * @param {number} id.path.required - The project id
 * @return {Project} 200 - success response
 * @security jwt 
 */
async function getProject(req: Request, res: Response) {
    const { projectId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    const proj = await repo.get(user.id, Number(projectId));
    return res.status(StatusCodes.OK).json(proj);
}

/**
 * GET /api/projects
 * @summary Get non-archived projects
 * @return {array<Project>} 200 - success response
 * @security jwt
 */
async function getProjects(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const projects = await repo.getProjects(user.id);
    return res.status(StatusCodes.OK).json(projects);
}

/**
 * GET /api/projects/archived
 * @summary Get archived projects
 * @return {array<Project>} 200 - success response
 * @security jwt
 */
async function getArchivedProjects(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const projects = await repo.getArchivedProjects(user.id);
    return res.status(StatusCodes.OK).json(projects);
}

/**
 * Share project request
 * @typedef {object} ShareProjectRequest
 * @property {array<string>} users.required - Lists of user ids
 */
export interface IShareProjectRequestBody {
    users: string[];
}

/**
 * POST /api/projects/{id}
 * @summary Share project with other users
 * @param {number} id.path.required - The project id
 * @param {ShareProjectRequest} request.body.required - request info
 * @return 200 - success response
 * @return {ErrorResponse} 400 - Bad request response
 * @security jwt
 */
async function shareProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);
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

/**
 * DELETE /api/projects/{id}
 * @summary Delete a project
 * @param {number} id.path.required - The project id
 * @return 204 - success response
 * @return {ErrorResponse} 400 - Bad request response
 * @security jwt
 */
async function deleteProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);
    try {
        await repo.deleteProject(user.id, Number(projectId));
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

/**
 * POST /api/projects/{id}
 * @summary Update a project
 * @param {number} id.path.required - The project id
 * @return {Project} 200 - success response
 * @return {ErrorResponse} 400 - bad request reponse
 * @security jwt
 */
async function updateProject(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);
    try {
        const proj = await repo.updateProject(user.id, projectId, req.body as IProjectCreationAttributes);
        return res.status(StatusCodes.OK).send(proj);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

/**
 * POST /api/projects/{projectId}/swap/{targetProjectId}
 * @summary Swap project's order
 * @param {number} projectId.path.required - The source project id
 * @param {number} targetProjectId.path.required - The target project id
 * @return {array<Project>} 200 - success response
 * @return {ErrorResponse} 400 - Bad request response
 */
async function swapProjectOrder(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId, targetProjectId } = new RouteParams(req);
    try {
        const projs = await repo.swapProjectOrder(user.id, projectId, targetProjectId);
        return res.status(StatusCodes.OK).send(projs);
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
        return this.getUrl('');
    }

    public getProjects() {
        return this.getUrl('');
    }

    public getArchivedProjects() {
        return this.getUrl('/archived');
    }

    public getProjectById(id?: string | number) {
        return this.getUrl(`/${id || (':' + getKey<RouteParams>('projectId'))}`);
    }

    public shareProject(id?: string | number) {
        return `${this.getProjectById(id)}/share`;
    }

    public updateProject(id?: string | number) {
        return this.getProjectById(id);
    }

    public swapProjectOrder(id?: string | number, targetProjectId?: string | number) {
        return `${this.getProjectById(id)}/swap/${targetProjectId ? targetProjectId : ':' + getKey<RouteParams>('targetProjectId')}`;
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
        return `${this.getProjectById(projectId)}/section/${sectId ? sectId : ':' + getKey<RouteParams>('sectionId')}`;
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
        return `${this.getSection(projectId, sourceSectId)}/swap/${targetSectId ? targetSectId : ':' + getKey<RouteParams>('targetSectionId')}`;
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
        return `${this.getProjectById(projectId)}/task/${(taskId ? taskId : ':' + getKey<RouteParams>('taskId'))}`;
    }

    public duplicateTask(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/duplicate`;
    }

    public swapTaskOrder(projectId?: number | string, taskId?: number | string, targetTaskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/swapOrder/${targetTaskId ? targetTaskId : ':' + getKey<RouteParams>('targetTaskId')}`;
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
        return `${this.getTask(projectId, taskId)}/move/${targetProjectId ? targetProjectId : ':' + getKey<RouteParams>('targetProjectId')}`;
    }

    public moveTaskToSection(projectId?: number | string, taskId?: number | string, targetProjectId?: number | string, sectId?: number | string) {
        return `${this.moveTask(projectId, taskId, targetProjectId)}/${sectId ? sectId : ':' + getKey<RouteParams>('targetSectionId')}`;
    }

    public addProjectComment(projectId?: number | string) {
        return `${this.getProjectById(projectId)}/comment`;
    }

    public getProjectComments(projectId?: number | string) {
        return this.addProjectComment(projectId);
    }

    public addTaskComment(projectId?: number | string, taskId?: number | string) {
        return `${this.getTask(projectId, taskId)}/comment`;
    }

    public getTaskComments(projectId?: number | string, taskId?: number | string) {
        return this.addTaskComment(projectId, taskId);
    }

    private getUrl(rel: string) {
        return this.relativeOnly ? rel : `/api${this.base}${rel}`;
    }
}


const projectRoutes = new ProjectRouteUrlBuilder();

// Project-route
const projectRouter = Router();

projectRouter.put(projectRoutes.create(), createProject);
projectRouter.get(projectRoutes.getProjects(), getProjects);
projectRouter.post(projectRoutes.updateProject(), updateProject);
projectRouter.get(projectRoutes.getArchivedProjects(), getArchivedProjects);
projectRouter.get(projectRoutes.getProjectById(), getProject);
projectRouter.post(projectRoutes.shareProject(), shareProject);
projectRouter.delete(projectRoutes.deleteProject(), deleteProject);
projectRouter.put(projectRoutes.addProjectComment(), addProjectComment);
projectRouter.get(projectRoutes.getProjectComments(), getProjectComments);
projectRouter.post(projectRoutes.swapProjectOrder(), swapProjectOrder);

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
projectRouter.put(projectRoutes.addTaskComment(), addTaskComment);
projectRouter.get(projectRoutes.getTaskComments(), getTaskComments);

export default projectRouter;