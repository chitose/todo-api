import { ITaskCreationAttributes, TASK_TABLE, TaskModel, TaskPriority, USER_PROJECTS_TABLE } from '@daos/models';
import { QueryTypes } from 'sequelize/dist';

import { IProjectRepository } from './project-repo';

export interface ITaskRepository {
    getTask(userId: string, taskId: number): Promise<TaskModel>;

    createTask(userId: string, taskProp: ITaskCreationAttributes): Promise<TaskModel>;

    updateTask(userId: string, taskId: number, taskProp: ITaskCreationAttributes): Promise<TaskModel>;

    deleteTask(userId: string, taskId: number): Promise<void>;

    assignTask(userId: string, taskId: number, assignToUserId: string): Promise<TaskModel>;

    setTaskPriority(userId: string, taskId: number, priority: TaskPriority): Promise<TaskModel>;

    completeTask(userId: string, taskId: number): Promise<TaskModel>;

    setTaskDueDate(userId: string, taskId: number, dueDate: Date): Promise<TaskModel>;

    moveToProject(userId: string, taskId: number, projectId: number): Promise<void>;

    duplicateTask(userId: string, taskId: number): Promise<TaskModel>;
}

class TaskRepository implements ITaskRepository {
    constructor(private projectRepo: IProjectRepository) { }

    async getTask(userId: string, taskId: number): Promise<TaskModel> {
        return (await TaskModel.sequelize?.query(`
        SELECT TOP t.* from ${TASK_TABLE} t left join ${USER_PROJECTS_TABLE} up on t.projectId = up.projectId
        WHERE t.id = :taskId AND up.userId = :userId
        `, {
            model: TaskModel,
            mapToModel: true,
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                taskId
            }
        }) as TaskModel[])[0];
    }

    async createTask(userId: string, taskProp: ITaskCreationAttributes): Promise<TaskModel> {
        if (!taskProp.projectId) {
            throw new Error('Task must belong to a project');
        }

        const proj = await this.projectRepo.get(userId, taskProp.projectId);
        if (!proj) {
            throw new Error('Non-exist project or you are not the project collaborator');
        }

        return await TaskModel.create(taskProp);
    }

    async updateTask(userId: string, taskId: number, taskProp: Partial<ITaskCreationAttributes>): Promise<TaskModel> {
        const task = await this.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        const { title, description, assignTo, dueDate, priority, parentTaskId, projectId } = taskProp;
        const updateProp = {} as ITaskCreationAttributes;

        if (title !== undefined) {
            updateProp.title = title;
        }

        if (description !== undefined) {
            updateProp.description = description;
        }

        if (assignTo !== undefined) {
            updateProp.assignTo = assignTo;
        }

        if (dueDate !== undefined) {
            updateProp.dueDate = dueDate;
        }

        if (priority !== undefined) {
            updateProp.priority = priority;
        }

        if (parentTaskId !== undefined) {
            updateProp.parentTaskId = parentTaskId;
        }

        if (projectId !== undefined) {
            updateProp.projectId = projectId;
        }

        await TaskModel.update(updateProp,
            {
                where: {
                    id: taskId
                }
            });

        return this.getTask(userId, taskId);
    }

    async deleteTask(userId: string, taskId: number): Promise<void> {
        const task = await this.getTask(userId, taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        await TaskModel.destroy({
            where: {
                id: taskId
            }
        });
    }

    async assignTask(userId: string, taskId: number, assignedToUserId: string): Promise<TaskModel> {
        return await this.updateTask(userId, taskId, { assignTo: assignedToUserId });
    }

    async setTaskPriority(userId: string, taskId: number, priority: TaskPriority): Promise<TaskModel> {
        return await this.updateTask(userId, taskId, { priority: priority });
    }

    async completeTask(userId: string, taskId: number): Promise<TaskModel> {
        return await this.updateTask(userId, taskId, { completed: true });
    }

    async setTaskDueDate(userId: string, taskId: number, dueDate: Date): Promise<TaskModel> {
        return await this.updateTask(userId, taskId, { dueDate: dueDate });
    }

    async moveToProject(userId: string, taskId: number, projectId: number): Promise<void> {
        await this.updateTask(userId, taskId, { projectId: projectId });
    }

    async duplicateTask(userId: string, taskId: number): Promise<TaskModel> {
        const task = await this.getTask(userId, taskId);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = task;
        return await this.createTask(userId, rest);
    }
}

export function createTaskRepository(projectRepo: IProjectRepository): ITaskRepository {
    return new TaskRepository(projectRepo);
}