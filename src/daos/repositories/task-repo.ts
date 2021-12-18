import {
    ITaskAttribute,
    ITaskCreationAttributes,
    IUserProjectsAttribute,
    TASK_TABLE,
    TaskModel,
    TaskPriority,
    USER_PROJECTS_TABLE,
} from '@daos/models';
import { getKey } from '@shared/utils';
import { Op, QueryTypes } from 'sequelize';

import { IProjectRepository } from './project-repo';

export interface ITaskRepository {
    getTasks(userId: string, projectId: number): Promise<TaskModel[]>;

    moveSectionTasks(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void>;

    moveProjectTask(userId: string, projectId: number, targetProjectId: number): Promise<void>;

    getTask(userId: string, taskId: number): Promise<TaskModel>;

    createTask(userId: string, taskProp: ITaskCreationAttributes): Promise<TaskModel>;

    swapOrder(userId: string, taskId: number, targetTaskId: number): Promise<TaskModel[]>;

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
    async getTasks(userId: string, projectId: number): Promise<TaskModel[]> {
        return await TaskModel.sequelize?.query(`
        SELECT t.* FROM ${TASK_TABLE} t
        LEFT JOIN ${USER_PROJECTS_TABLE} up
        ON t.${getKey<ITaskAttribute>('projectId')} = up.${getKey<IUserProjectsAttribute>('projectId')}
        WHERE t.${getKey<ITaskAttribute>('projectId')} = :projectId
        AND up.${getKey<IUserProjectsAttribute>('userId')} = :userId
        `,
            {
                type: QueryTypes.SELECT,
                model: TaskModel,
                mapToModel: true,
                replacements: {
                    userId,
                    projectId
                }
            }) as TaskModel[];
    }

    async moveSectionTasks(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void> {
        const proj = await this.projectRepo.get(userId, projectId);
        const targetProj = await this.projectRepo.get(userId, targetProjectId);
        if (!proj || !targetProj) {
            throw new Error('Project not found or not project callaborator');
        }

        await TaskModel.update({
            projectId: targetProjectId
        }, {
            where: {
                [Op.and]: {
                    projectId: { [Op.eq]: projectId },
                    sectionId: { [Op.eq]: sectId }
                }
            }
        });
    }

    async moveProjectTask(userId: string, projectId: number, targetProjectId: number): Promise<void> {
        const proj = await this.projectRepo.get(userId, projectId);
        const targetProj = await this.projectRepo.get(userId, targetProjectId);
        if (!proj || !targetProj) {
            throw new Error('Project not found or not project callaborator');
        }

        await TaskModel.update({
            projectId: targetProjectId
        }, {
            where: {
                [Op.and]: {
                    projectId: { [Op.eq]: projectId }
                }
            }
        });
    }

    async swapOrder(userId: string, taskId: number, targetTaskId: number): Promise<TaskModel[]> {
        const task = await this.getTask(userId, taskId);
        const targetTask = await this.getTask(userId, targetTaskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (!targetTask) {
            throw new Error(`Task ${targetTaskId} not found`);
        }

        const t = await TaskModel.sequelize?.transaction();
        try {
            const updateTask = await this.updateTask(userId, task.id, { taskOrder: targetTask.taskOrder });
            const updateTargetTask = await this.updateTask(userId, targetTask.id, { taskOrder: task.taskOrder });
            await t?.commit();
            return [updateTask, updateTargetTask];
        } catch (e) {
            t?.rollback();
            return [];
        }
    }

    async getTask(userId: string, taskId: number): Promise<TaskModel> {
        return (await TaskModel.sequelize?.query(`
        SELECT t.* from ${TASK_TABLE} t left join ${USER_PROJECTS_TABLE} up on t.projectId = up.projectId
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

        if (!taskProp.taskOrder) {
            let taskOrder = 0;
            if (taskProp.sectionId) {
                taskOrder = await TaskModel.max<number, TaskModel>('taskOrder', {
                    where: {
                        [Op.and]: {
                            projectId: {
                                [Op.eq]: proj.id
                            },
                            sectionId: { [Op.eq]: taskProp.sectionId }
                        }
                    }
                })
            } else {
                taskOrder = await TaskModel.max<number, TaskModel>('taskOrder', {
                    where: {
                        projectId: {
                            [Op.eq]: proj.id
                        }
                    }
                });
            }
            taskProp.taskOrder = taskOrder + 1;
        }

        return await TaskModel.create(taskProp);
    }

    async updateTask(userId: string, taskId: number, taskProp: Partial<ITaskCreationAttributes>): Promise<TaskModel> {
        const task = await this.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        const { title, description, assignTo, dueDate, priority, parentTaskId, projectId, taskOrder } = taskProp;
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

        if (taskOrder !== undefined) {
            updateProp.taskOrder = taskOrder;
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
        if (!task) {
            throw new Error('Task not found');
        }
        // using destructuring will not work becaus task is proxy object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return await this.createTask(userId, {
            title: task.title,
            description: task.description,
            completed: task.completed,
            assignTo: task.assignTo,
            dueDate: task.dueDate,
            projectId: task.projectId,
            sectionId: task.sectionId,
            priority: task.priority,
            parentTaskId: task.parentTaskId
        });
    }
}

export function createTaskRepository(projectRepo: IProjectRepository): ITaskRepository {
    return new TaskRepository(projectRepo);
}