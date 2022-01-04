import { IUserAttribute } from '@daos/models';
import { getSearchRepository, getTaskRepository } from '@daos/repositories';
import { getKey } from '@shared/utils';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

const taskRepo = getTaskRepository();
const searchRepo = getSearchRepository();

export class ViewRouteUrlBuilder {
    constructor(private relative = true) { }

    public today() {
        return this.getUrl('/view/today');
    }

    public upcomming() {
        return this.getUrl('/view/upcomming');
    }

    public search(query?: string) {
        return this.getUrl(`/search${query ? '/' + query : '/:query?'}`);
    }

    public tasksByLabel(labelId?: number | string) {
        return this.getUrl(`/view/label/${labelId ? labelId : ':' + getKey<RouteParams>('labelId')}`);
    }

    private getUrl(url: string) {
        return !this.relative ? '/api' + url : url;
    }
}


/**
 * GET /api/view/today
 *
 * @summary get Tasks overdue today
 * @description Return all tasks that have due date <= today
 * @return {array<Task>} 200 - success response
 * @security jwt
 */
export async function getTodayTasks(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const tasks = await taskRepo.getTodayTasks(user.id);
    return res.status(StatusCodes.OK).json(tasks);
}

/**
 * GET /api/view/upcomming
 *
 * @summary get all upcoming tasks
 * @description Return all upcomming tasks
 * @return {array<Task>} 200 - success response
 * @security jwt
 */
export async function getUpcommingTasks(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const tasks = await taskRepo.getUpCommingTasks(user.id);
    return res.status(StatusCodes.OK).json(tasks);
}

/**
 * GET /api/search/{query}
 *
 * @summary search
 * @description Return all matches result (task, project, comment)
 * @param {string} query.path.required - The search query
 * @return {array<SearchResult>} 200 - success response
 * @security jwt
 */
export async function search(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { query } = req.params;
    const results = await searchRepo.search(user.id, query);
    return res.status(StatusCodes.OK).json(results);
}

/**
 * GET /api/view/label/{labelId}
 *
 * @summary Get all tasks tagged by label
 * @param {number} labelId.path.required - The label id
 * @param {array<Task>} 200 - Success response
 * @security jwt
 */
export async function tasksByLabel(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { labelId } = new RouteParams(req);
    const results = await taskRepo.getLabelTasks(user.id, labelId);
    return res.status(StatusCodes.OK).json(results);
}