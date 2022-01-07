import { IProjectCommentCreationAttributes, ITaskCommentCreationAttribute, IUserAttribute } from '@daos/models';
import { getCommentRepository } from '@daos/repositories';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

const repo = getCommentRepository();


/**
 * PUT /api/projects/{id}/comment
 *
 * @summary Add project comment
 * @param {ProjectCommentCreation} request.body.required - comment information
 * @param {number} id.path.required - The project id
 * @return {Comment} 200 - success response
 * @return {ErrorResponse} 400 - Bad request response
 * @security jwt
 */
export async function addProjectComment(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);
    try {
        const cmt = await repo.addProjectComment(user.id, projectId, (req.body as IProjectCommentCreationAttributes).comments);
        return res.status(StatusCodes.CREATED).json(cmt);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * GET /api/projects/{id}/comment
 *
 * @summary Get project comments
 * @param {number} id.path.required - The project id
 * @return {array<Comment>} 200 - success response
 * @security jwt
 */
export async function getProjectComments(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);

    const cmts = await repo.getProjectComments(user.id, projectId);
    return res.status(StatusCodes.OK).json(cmts);
}

/**
 * PUT /api/projects/{projectId}/tasks/{taskId}/comment
 *
 * @summary Add task comment
 * @param {TaskCommentCreation} request.body.required - comment information
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @return {Comment} 200 - success response
 * @return {ErrorResponse} 400 - Bad request response
 * @security jwt
 */
export async function addTaskComment(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId, taskId } = new RouteParams(req);
    try {
        const cmt = await repo.addTaskComment(user.id, projectId, taskId, (req.body as ITaskCommentCreationAttribute).comments);
        return res.status(StatusCodes.CREATED).json(cmt);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * GET /api/projects/{projectId}/tasks/{taskId}/comment
 *
 * @summary Get task comments
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @return {array<Comment>} 200 - success response
 * @security jwt
 */
export async function getTaskComments(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId, taskId } = new RouteParams(req);

    const cmts = await repo.getTaskComments(user.id, projectId, taskId);
    return res.status(StatusCodes.OK).json(cmts);
}