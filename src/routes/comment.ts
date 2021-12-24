import { ICommentCreationAttributes, IUserAttribute } from '@daos/models';
import { getCommentRepository } from '@daos/repositories';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

const repo = getCommentRepository();


export async function addProjectComment(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);
    try {
        const cmt = await repo.addProjectComment(user.id, projectId, (req.body as ICommentCreationAttributes).comments);
        return res.status(StatusCodes.CREATED).json(cmt);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

export async function getProjectComments(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);

    const cmts = await repo.getProjectComments(user.id, projectId);
    return res.status(StatusCodes.OK).json(cmts);
}

export async function addTaskComment(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId, taskId } = new RouteParams(req);
    try {
        const cmt = await repo.addTaskComment(user.id, projectId, taskId, (req.body as ICommentCreationAttributes).comments);
        return res.status(StatusCodes.CREATED).json(cmt);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

export async function getTaskComments(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId, taskId } = new RouteParams(req);

    const cmts = await repo.getTaskComments(user.id, projectId, taskId);
    return res.status(StatusCodes.OK).json(cmts);
}