import {
    CommentModel,
    IProjectAttribute,
    ITaskCreationAttributes,
    ITaskLabelAttribute,
    LabelModel,
    ProjectModel,
    ProjectUserAssociation,
    TaskCommentAssociation,
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
import moment from 'moment';
import { Includeable, Op, Sequelize } from 'sequelize';

import { IProjectRepository } from './project-repo';

export interface ITaskRepository {
    search(userId: string, text: string): Promise<TaskModel[]>;

    getUpCommingTasks(id: string): Promise<TaskModel[]>;

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

    getTodayTasks(userId: string): Promise<TaskModel[]>;

    getLabelTasks(userId: string, labelId: number): Promise<TaskModel[]>;
}

class TaskRepository implements ITaskRepository {
    constructor(private projectRepo: IProjectRepository) {
        projectRepo.taskRepo = this;
    }

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

    search(userId: string, text: string): Promise<TaskModel[]> {
        return TaskModel.findAll({
            where: {
                [Op.or]: {
                    title: { [Op.like]: `%${text}%` },
                    description: { [Op.like]: `%${text}%` }
                }
            },
            include: this.getCommonUserInclude(userId)
        });
    }

    getLabelTasks(userId: string, labelId: number): Promise<TaskModel[]> {
        return TaskModel.findAll({
            include: [{
                model: LabelModel,
                as: TaskLabelAssociation.as,
                attributes: ['id', 'title'],
                where: {
                    id: labelId
                },
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
            }]
        });
    }

    getUpCommingTasks(userId: string): Promise<any[]> {
        const today = new Date();
        return TaskModel.findAll({
            where: {
                dueDate: {
                    [Op.or]: {
                        [Op.lt]: moment(today).startOf('day').toDate(),
                        [Op.gt]: moment(today).endOf('day').toDate()
                    }
                }
            },
            include: this.getCommonUserInclude(userId)
        });
    }

    getTodayTasks(userId: string): Promise<TaskModel[]> {
        return TaskModel.findAll({
            where: {
                dueDate: { [Op.lte]: moment(new Date()).endOf('day').toDate() }
            },
            include: this.getCommonUserInclude(userId)
        });
    }

    async getTasks(userId: string, projectId: number): Promise<TaskModel[]> {
        return TaskModel.findAll({
            where: {
                projectId: projectId
            },
            attributes: {
                include: [
                    [
                        Sequelize.literal(`(
                        SELECT ${getKey<TaskSubTaskModel>('taskId')}
                        FROM ${TaskSubTaskModel.tableName}
                        WHERE ${getKey<TaskSubTaskModel>('taskId')} = TaskModel.${getKey<TaskModel>('id')}
                        )`), 'parentTaskId'
                    ]
                ]
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
            include: [...this.getCommonUserInclude(userId),
            {
                model: CommentModel,
                as: TaskCommentAssociation.as
            },
            {
                model: TaskModel,
                as: TaskSubTaskAssociation.as,
                through: {
                    attributes: []
                }
            }]
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

        const { title, description, assignTo, dueDate, labels, priority, projectId, taskOrder } = taskProp;
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
        if (labels) {
            const newLabels = labels.filter(l => !task.labels?.find(tl => tl.id === l.id));
            const removedLabels = task.labels?.filter(l => !labels.find(tl => tl.id === l.id)).map(l => l.id) as number[];
            await TaskLabelModel.destroy({
                where: {
                    taskId: task.id,
                    labelId: { [Op.in]: removedLabels }
                }
            });

            await TaskLabelModel.bulkCreate(newLabels.map(l => ({ taskId: task.id, labelId: l.id } as ITaskLabelAttribute)));
        }

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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        async function dupInternal(userId: string, taskId: number) {
            const task = await self.getTask(userId, taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            // using destructuring will not work becaus task is proxy object
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const dupTask = await self.createTask(userId, {
                title: `Copy of ${task.title}`,
                description: task.description,
                completed: task.completed,
                assignTo: task.assignTo,
                dueDate: task.dueDate,
                projectId: task.projectId,
                sectionId: task.sectionId,
                priority: task.priority
            });

            // parentTask
            const parentTask = await TaskSubTaskModel.findOne({ where: { subTaskId: task.id } });
            if (parentTask) {
                await TaskSubTaskModel.create({ taskId: parentTask.taskId, subTaskId: dupTask.id });
            }
            const childTasks = await TaskSubTaskModel.findAll({ where: { taskId: task.id } });
            if (childTasks) {
                for (const ct of childTasks) {
                    await dupInternal(userId, ct.subTaskId);
                }
            }
        }

        await dupInternal(userId, taskId);

        return this.getTask(userId, taskId) as unknown as TaskModel;
    }
}

export function createTaskRepository(projectRepo: IProjectRepository): ITaskRepository {
    return new TaskRepository(projectRepo);
}
