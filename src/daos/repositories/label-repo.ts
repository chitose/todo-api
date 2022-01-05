import { LabelModel } from '@daos/models';
import { Op } from 'sequelize';

import { ITaskRepository } from './task-repo';

export interface ILabelRepository {
    createLabel(userId: string, name: string): Promise<LabelModel>;
    deleteLabel(userId: string, id: number): Promise<void>;
    swapLabelOrder(userId: string, id: number, targetLabelId: number): Promise<LabelModel[]>;
    search(userId: string, text: string): Promise<LabelModel[]>;
}

class LabelRepository implements ILabelRepository {
    constructor(private taskRepo: ITaskRepository) {
    }

    async createLabel(userId: string, name: string): Promise<LabelModel> {
        const maxOrder = await LabelModel.max<number, LabelModel>('order', {
            where: {
                userId: userId
            }
        });

        return LabelModel.create({
            title: name,
            userId,
            order: (maxOrder || 0) + 1
        });
    }

    async swapLabelOrder(userId: string, id: number, targetLabelId: number): Promise<LabelModel[]> {
        const labels = await LabelModel.findAll({
            where: {
                userId: userId,
                id: { [Op.in]: [id, targetLabelId] }
            }
        });

        if (labels.length === 2) {
            await LabelModel.update({ order: labels[0].order }, {
                where: {
                    userId: userId,
                    id: labels[1].id
                }
            });

            await LabelModel.update({ order: labels[1].order }, {
                where: {
                    userId: userId,
                    id: labels[0].id
                }
            });
        }
        const tempOrder = labels[0].order;
        labels[0].order = labels[1].order;
        labels[1].order = tempOrder;
        return labels;
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
}

export function createLabelRepository(taskRep: ITaskRepository): ILabelRepository {
    return new LabelRepository(taskRep);
}