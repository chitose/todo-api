import {
    ILabelAttribute,
    ITaskAttribute,
    ITaskLabelAttribute,
    IUserProjectsAttribute,
    LABEL_TABLE,
    LabelModel,
    TASK_LABELS_TABLE,
    TASK_TABLE,
    TaskLabelModel,
    USER_PROJECTS_TABLE,
} from '@daos/models';
import { getKey } from '@shared/utils';
import { Op } from 'sequelize';

import { ITaskRepository } from './task-repo';

export interface ILabelRepository {
    createLabel(userId: string, name: string): Promise<LabelModel>;
    deleteLabel(userId: string, id: number): Promise<void>;
    search(userId: string, text: string): Promise<LabelModel[]>;
    addTaskLabels(userId: string, taskId: number, labels: number[]): Promise<void>;
    getTaskLabels(userId: string, taskId: number): Promise<LabelModel[]>;
}

class LabelRepository implements ILabelRepository {
    constructor(private taskRepo: ITaskRepository) {
    }

    async createLabel(userId: string, name: string): Promise<LabelModel> {
        return LabelModel.create({
            title: name,
            userId
        });
    }

    async deleteLabel(userId: string, id: number): Promise<void> {
        await LabelModel.destroy({
            where: {
                [Op.and]: {
                    id: id,
                    userId: userId
                }
            }
        })
    }

    async search(userId: string, text: string): Promise<LabelModel[]> {
        return LabelModel.findAll({
            where: {
                [Op.and]: {
                    title: {
                        [Op.substring]: text
                    },
                    userId: userId
                }
            }
        });
    }

    async addTaskLabels(userId: string, taskId: number, labels: number[]): Promise<void> {
        const task = await this.taskRepo.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        await TaskLabelModel.bulkCreate(labels.map(lid => ({
            taskId: taskId,
            labelId: lid,
        })));
    }

    async getTaskLabels(userId: string, taskId: number): Promise<LabelModel[]> {
        return await LabelModel.sequelize?.query(`
        SELECT p.*
        FROM ${LABEL_TABLE} l 
        LEFT JOIN ${TASK_LABELS_TABLE} tl up ON l.${getKey<ILabelAttribute>('id')} = tl.${getKey<ITaskLabelAttribute>('labelId')}
        LEFT JOIN ${TASK_TABLE} t ON t.${getKey<ITaskAttribute>('id')} = tl.${getKey<ITaskLabelAttribute>('taskId')}
        LEFT JOIN ${USER_PROJECTS_TABLE} up ON t.${getKey<ITaskAttribute>('projectId')} = up.${getKey<IUserProjectsAttribute>('projectId')}
            AND up.${getKey<IUserProjectsAttribute>('userId')} =:userId
        WHERE tl.${getKey<ITaskLabelAttribute>('taskId')} = :taskId
        `, {
            model: LabelModel,
            mapToModel: true,
            replacements: {
                taskId,
                userId
            }
        }) as LabelModel[];
    }

}

export function createLabelRepository(taskRep: ITaskRepository): ILabelRepository {
    return new LabelRepository(taskRep);
}