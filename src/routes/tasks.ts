import { ITaskCreationAttributes, IUserAttribute } from '@daos/models';
import { getTaskRepository } from '@daos/repositories';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

const taskRepo = getTaskRepository();


// getTasks(userId: string, projectId: number): Promise<TaskModel[]>;

export async function getTasks(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const projectId = Number(req.params[RouteParams.ProjectId]);
    const tasks = await taskRepo.getTasks(user.id, projectId);
    return res.status(StatusCodes.OK).json(tasks);
}

//     moveSectionTasks(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void>;

//     moveProjectTask(userId: string, projectId: number, targetProjectId: number): Promise<void>;

//     getTask(userId: string, taskId: number): Promise<TaskModel>;
export async function getTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute
    const taskId = Number(req.params[RouteParams.TaskId]);
    const task = await taskRepo.getTask(user.id, taskId);
    return res.status(StatusCodes.OK).json(task);
}

// swapOrder(userId: string, taskId: number, targetTaskId: number): Promise<TaskModel[]>;
export async function swapTaskOrder(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const taskId = Number(req.params[RouteParams.TaskId]);
    const newOrder = Number(req.body);
    try {
        const t = await taskRepo.swapOrder(user.id, taskId, newOrder);
        return res.status(StatusCodes.OK).json(t);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

//     updateTask(userId: string, taskId: number, taskProp: ITaskCreationAttributes): Promise<TaskModel>;
export async function updateTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const taskId = Number(req.params[RouteParams.TaskId]);
    const taskProp = req.body as ITaskCreationAttributes;
    try {
        const t = await taskRepo.updateTask(user.id, taskId, taskProp);
        return res.status(StatusCodes.OK).json(t);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

//     deleteTask(userId: string, taskId: number): Promise<void>;
export async function deleteTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const taskId = Number(req.params[RouteParams.TaskId]);
    try {
        await taskRepo.deleteTask(user.id, taskId);
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

//     assignTask(userId: string, taskId: number, assignToUserId: string): Promise<TaskModel>;
export async function assignTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const taskId = Number(req.params[RouteParams.TaskId]);
    const targetUser = req.body;
    try {
        const task = await taskRepo.assignTask(user.id, taskId, targetUser);
        return res.status(StatusCodes.OK).json(task);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

//     setTaskPriority(userId: string, taskId: number, priority: TaskPriority): Promise<TaskModel>;

//     completeTask(userId: string, taskId: number): Promise<TaskModel>;

//     setTaskDueDate(userId: string, taskId: number, dueDate: Date): Promise<TaskModel>;

//     moveToProject(userId: string, taskId: number, projectId: number): Promise<void>;

//     duplicateTask(userId: string, taskId: number): Promise<TaskModel>;
export async function duplicateTask(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const taskId = Number(req.params[RouteParams.TaskId]);

    try {
        const dt = await taskRepo.duplicateTask(user.id, taskId);
        return res.status(StatusCodes.CREATED).json(dt);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}
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