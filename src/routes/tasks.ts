import { ITaskCreationAttributes, IUserAttribute } from '@daos/models';
import { getTaskRepository } from '@daos/repositories';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

const taskRepo = getTaskRepository();


// getTasks(userId: string, projectId: number): Promise<TaskModel[]>;

/**
 * GET /api/projects/{projectId}/task
 *
 * @summary Get project's tasks
 * @description Return all tasks from a project.
 * @param {number} projectId.path.required - The project id
 * @return {array<Task>} 200 - success reponse
 */
export async function getTasks(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId } = new RouteParams(req);
    const tasks = await taskRepo.getTasks(user.id, projectId);
    return res.status(StatusCodes.OK).json(tasks);
}

//     moveSectionTasks(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void>;
/**
 * POST /api/projects/{projectId}/task/{taskId}/move/{targetProjectId}/{targetSectionId}
 * @summary Move task to other project
 * @description Move a task from a project to another one.
 * @param {number} projectId.path.required - The source project id
 * @param {number} taskId.path.required - The source task id
 * @param {number} targetProjectId.path.required - The target project id
 * @param {number} targetSectionId.path - The target project id
 * @return 204 - success response
 * @return {ErrorResponse} - 400 - Bad request response
 */
export async function moveTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { projectId, targetProjectId, targetSectionId } = new RouteParams(req);
    try {
        await taskRepo.moveTask(user.id, projectId, targetProjectId, targetSectionId);
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}


/**
 * GET /api/projects/{projectId}/task/{taskId}
 *
 * @summary Get task info
 * @description Return a single task info by id
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @return {Task} 200 - success response
 */
export async function getTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute
    const { taskId } = new RouteParams(req);
    const task = await taskRepo.getTask(user.id, taskId);
    return res.status(StatusCodes.OK).json(task);
}


/**
 * POST /api/projects/{projectId}/task/{taskId}/swapOrder/{targetTaskId}
 *
 * @summary Swap task order
 * @description Swap the order of 2 tasks
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The source task id
 * @param {number} targetTaskId.path.required - The target task id
 * @return {array<Task>} 200 - success response
 * @return {ErrorResponse} 400 - Bad request response
 */
export async function swapTaskOrder(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    const newOrder = Number(req.body);
    try {
        const t = await taskRepo.swapOrder(user.id, taskId, newOrder);
        return res.status(StatusCodes.OK).json(t);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}


/**
 * POST /api/projects/{projectId}/task/{taskId}
 *
 * @summary Update task info
 * @description Update task
 * @param {number} projectId.path.required - The projec tid
 * @param {number} taskId.path.required - The task id
 * @param {TaskCreation} request.body.required - The udpate info
 * @return {Task} 200 - success response
 * @return {ErrorResponse} 400 - Bad request response
 */
export async function updateTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    const taskProp = req.body as ITaskCreationAttributes;
    try {
        const t = await taskRepo.updateTask(user.id, taskId, taskProp);
        return res.status(StatusCodes.OK).json(t);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}


/**
 * DELETE /api/projects/{projectId}/task/{taskId}
 *
 * @summary Delete a task
 * @description Delete a task
 * @param {number} projectId.path.required - The projec tid
 * @param {number} taskId.path.required - The task id
 * @return 201 - Success response
 * @return {ErrorResponse} 400 - Bad request response
 */
export async function deleteTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    try {
        await taskRepo.deleteTask(user.id, taskId);
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}


/**
 * AssignTask info
 * @typedef {object} AssignTask request
 * @property {string} assignTo - The user id
 */

/**
 * POST /api/projects/{projectId}/task/{taskId}/assignTask
 *
 * @summary Assign task to a user
 * @description Assign a task to a user
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @param {AssignTask} request.body.required - The assign task request
 * @return {Task} 200 - success response
 * @return {Task} 400 - bad request reponse
 */
export async function assignTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    const { assignTo } = req.body as ITaskCreationAttributes;
    try {
        const task = await taskRepo.assignTask(user.id, taskId, assignTo!);
        return res.status(StatusCodes.OK).json(task);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * TaskPriority request info
 * @typedef {object} TaskPriorityRequest
 * @property {number} priority - The task priority (0-3)
 */

/**
 * POST /api/projects/{projectId}/task/{taskId}/priority
 *
 * @summary Set the task priority
 * @description Set the task priority
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @param {TaskPriorityRequest} request.body.required - The task priority request
 * @return {Task} 200 - success response
 * @return {Task} 400 - bad request reponse
 */
export async function setTaskPriority(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    try {
        if (!req.body) {
            throw new Error('Missing priority value');
        }
        const priority = Number(req.body);
        const task = await taskRepo.setTaskPriority(user.id, taskId, priority);
        return res.status(StatusCodes.OK).json(task);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * POST /api/projects/{projectId}/task/{taskId}/complete
 *
 * @summary Set task as done
 * @description Mark the task as done
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @return {Task} 200 - success response
 * @return {Task} 400 - bad request reponse
 */
//     completeTask(userId: string, taskId: number): Promise<TaskModel>;
export async function completeTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    try {
        const task = await taskRepo.completeTask(user.id, taskId);
        return res.status(StatusCodes.OK).json(task);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * Task due date request
 * @typedef {object} TaskDueDateRequest
 * @property {string} dueDate - The date in string format
 */

/**
 * POST /api/projects/{projectId}/task/{taskId}/duedate
 *
 * @summary Set the task due date
 * @description Set the task due date
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @param {TaskDueDateRequest} request.body.required - The due date request
 * @return {Task} 200 - success response
 * @return {Task} 400 - bad request reponse
 */
//     setTaskDueDate(userId: string, taskId: number, dueDate: Date): Promise<TaskModel>;
export async function setTaskDueDate(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);
    try {
        if (!req.body) {
            throw new Error('Missing due date');
        }
        const task = await taskRepo.setTaskDueDate(user.id, taskId, req.body as Date);
        return res.status(StatusCodes.OK).json(task);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * POST /api/projects/{projectId}/task/{taskId}/duplicate
 *
 * @summary Duplicate the task
 * @description Duplicate the task (and its sub-tasks)
 * @param {number} projectId.path.required - The project id
 * @param {number} taskId.path.required - The task id
 * @return {Task} 201 - success response
 * @return {Task} 400 - bad request reponse
 */
//     duplicateTask(userId: string, taskId: number): Promise<TaskModel>;
export async function duplicateTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { taskId } = new RouteParams(req);

    try {
        const dt = await taskRepo.duplicateTask(user.id, taskId);
        return res.status(StatusCodes.CREATED).json(dt);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

/**
 * PUT /api/projects/{projectId}/task
 *
 * @summary Create a new task
 * @description Create a new task
 * @param {number} projectId.path.required - The project id
 * @param {TaskCreation} request.body.required - The task info
 * @return {Task} 201 - success response
 * @return {Task} 400 - bad request reponse
 */
//     createTask(userId: string, taskProp: ITaskCreationAttributes): Promise<TaskModel>;
export async function createTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const taskProp = req.body as ITaskCreationAttributes;
    try {
        const task = await taskRepo.createTask(user.id, taskProp);
        return res.status(StatusCodes.CREATED).json(task);
    } catch (e) {
        return res.status(StatusCodes.BAD_REQUEST)
    }
}