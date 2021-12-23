import { LabelModel } from '@daos/models';
import { Op } from 'sequelize';

import { ITaskRepository } from './task-repo';

export interface ILabelRepository {
    createLabel(userId: string, name: string): Promise<LabelModel>;
    deleteLabel(userId: string, id: number): Promise<void>;
    search(userId: string, text: string): Promise<LabelModel[]>;
    addTaskLabels(userId: string, taskId: number, labels: number[]): Promise<void>;
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
        // const task = await this.taskRepo.getTask(userId, taskId);
        // if (!task) {
        //     throw new Error('Task not found');
        // }

        // await TaskLabelModel.bulkCreate(labels.map(lid => ({
        //     taskId: taskId,
        //     labelId: lid,
        // })));
    }
}

export function createLabelRepository(taskRep: ITaskRepository): ILabelRepository {
    return new LabelRepository(taskRep);
}