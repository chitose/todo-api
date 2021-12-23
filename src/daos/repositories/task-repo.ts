import {
    IProjectAttribute,
    ITaskCreationAttributes,
    ITaskLabelAttribute,
    LabelModel,
    ProjectModel,
    ProjectUserAssociation,
    TaskLabelAssociation,
    TaskLabelModel,
    TaskModel,
    TaskPriority,
    TaskProjectAssociation,
    TaskSubTaskAssociation,
    TaskSubTaskModel,
    UserModel,
} from '@daos/models';
import { getKey } from '@shared/utils';
import { Includeable, Op } from 'sequelize';

import { IProjectRepository } from './project-repo';

export interface ITaskRepository {
    getTasks(userId: string, projectId: number): Promise<TaskModel[]>;

    moveTask(userId: string, projectId: number, targetProjectId: number, targetSectId?: number): Promise<void>;

    getTask(userId: string, taskId: number): Promise<TaskModel | null>;

    createTask(userId: string, taskProp: ITaskCreationAttributes): Promise<TaskModel>;

    swapOrder(userId: string, taskId: number, targetTaskId: number): Promise<TaskModel[]>;

    updateTask(userId: string, taskId: number, taskProp: ITaskCreationAttributes): Promise<TaskModel>;

    deleteTask(userId: string, taskId: number): Promise<void>;

    assignTask(userId: string, taskId: number, assignToUserId: string): Promise<TaskModel>;

    setTaskPriority(userId: string, taskId: number, priority: TaskPriority): Promise<TaskModel>;

    completeTask(userId: string, taskId: number): Promise<TaskModel>;

    setTaskDueDate(userId: string, taskId: number, dueDate: Date): Promise<TaskModel>;

    duplicateTask(userId: string, taskId: number): Promise<TaskModel>;
}

class TaskRepository implements ITaskRepository {
    constructor(private projectRepo: IProjectRepository) { }
    private getCommonUserInclude(userId: string): Includeable[] {
        return [
            {
                model: LabelModel,
                as: TaskLabelAssociation.as,
                attributes: ['id', 'title'],
                through: {
                    attributes: []
                }
            },
            {
                model: TaskModel,
                as: TaskSubTaskAssociation.as
            },
            {
                model: ProjectModel,
                required: true,
                as: TaskProjectAssociation.as,
                attributes: [getKey<IProjectAttribute>('id')],
                include: [
                    {
                        model: UserModel,
                        required: true,
                        as: ProjectUserAssociation.as,
                        where: {
                            id: userId
                        },
                        attributes: []
                    }
                ]
            }
        ];
    }

    async getTasks(userId: string, projectId: number): Promise<TaskModel[]> {
        return TaskModel.findAll({
            where: {
                projectId: projectId
            },
            include: this.getCommonUserInclude(userId)
        });
    }

    async moveTask(userId: string, projectId: number, targetProjectId: number, targetSectionId?: number): Promise<void> {
        const proj = await this.projectRepo.get(userId, projectId);
        const targetProj = await this.projectRepo.get(userId, targetProjectId);
        if (!proj || !targetProj) {
            throw new Error('Project not found or not project callaborator');
        }

        const updateProp: Partial<ITaskCreationAttributes> = {
            projectId: targetProjectId
        };

        if (targetSectionId) {
            updateProp.sectionId = targetSectionId;
        }

        await TaskModel.update(updateProp, {
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

    async getTask(userId: string, taskId: number): Promise<TaskModel | null> {
        return TaskModel.findOne({
            where: {
                id: {
                    [Op.eq]: taskId
                }
            },
            include: this.getCommonUserInclude(userId)
        });
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
        const { parentTaskId, labels, ...createTaskProps } = taskProp;
        const task = await TaskModel.create(createTaskProps);

        if (labels) {
            await TaskLabelModel.bulkCreate(labels.map(l => ({ taskId: task.id, labelId: l.id } as ITaskLabelAttribute)));
        }

        if (parentTaskId) {
            await TaskSubTaskModel.create({
                taskId: parentTaskId,
                subTaskId: task.id
            });
        }
        return this.getTask(userId, task.id) as unknown as TaskModel;
    }

    async updateTask(userId: string, taskId: number, taskProp: Partial<ITaskCreationAttributes>): Promise<TaskModel> {
        const task = await this.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        const { title, description, assignTo, dueDate, priority, projectId, taskOrder } = taskProp;
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

        return this.getTask(userId, taskId) as unknown as TaskModel;
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
        return this.updateTask(userId, taskId, { assignTo: assignedToUserId });
    }

    async setTaskPriority(userId: string, taskId: number, priority: TaskPriority): Promise<TaskModel> {
        return this.updateTask(userId, taskId, { priority: priority });
    }

    async completeTask(userId: string, taskId: number): Promise<TaskModel> {
        return this.updateTask(userId, taskId, { completed: true });
    }

    async setTaskDueDate(userId: string, taskId: number, dueDate: Date): Promise<TaskModel> {
        return this.updateTask(userId, taskId, { dueDate: dueDate });
    }

    async duplicateTask(userId: string, taskId: number): Promise<TaskModel> {
        const task = await this.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        // using destructuring will not work becaus task is proxy object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return this.createTask(userId, {
            title: task.title,
            description: task.description,
            completed: task.completed,
            assignTo: task.assignTo,
            dueDate: task.dueDate,
            projectId: task.projectId,
            sectionId: task.sectionId,
            priority: task.priority
        });
    }
}

export function createTaskRepository(projectRepo: IProjectRepository): ITaskRepository {
    return new TaskRepository(projectRepo);
}

function ILabelAttribute(arg0: string) {
    throw new Error('Function not implemented.');
}
