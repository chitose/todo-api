import { ILabelCreationAttribute, LabelModel } from '@daos/models';
import { Op } from 'sequelize';

import { ITaskRepository } from './task-repo';

export interface ILabelRepository {
    getLabels(userId: string): Promise<LabelModel[]>;
    renameLabel(userId: string, id: number, name: string): Promise<LabelModel>;
    createLabel(userId: string, prop: ILabelCreationAttribute): Promise<LabelModel>;
    deleteLabel(userId: string, id: number): Promise<void>;
    swapLabelOrder(userId: string, id: number, targetLabelId: number): Promise<LabelModel[]>;
    search(userId: string, text: string): Promise<LabelModel[]>;
}

class LabelRepository implements ILabelRepository {
    constructor(private taskRepo: ITaskRepository) {
    }

    getLabels(userId: string): Promise<LabelModel[]> {
        return LabelModel.findAll({ where: { userId: userId } });
    }

    async renameLabel(userId: string, id: number, name: string): Promise<LabelModel> {
        await LabelModel.update({ title: name }, { where: { userId, id } });
        return LabelModel.findByPk(id) as unknown as LabelModel;
    }

    async createLabel(userId: string, prop: ILabelCreationAttribute): Promise<LabelModel> {
        const { aboveLabel, belowLabel } = prop;
        let maxOrder = 0;
        if (aboveLabel) {
            const targetLabel = await LabelModel.findByPk(aboveLabel);
            const aboveLabels = await LabelModel.findAll({ where: { userId, order: { [Op.lt]: targetLabel?.order } } });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            maxOrder = targetLabel!.order - 1;
            for (const l of aboveLabels) {
                await LabelModel.update({ order: l.order - 1 }, { where: { id: l.id } });
            }
        } else if (belowLabel) {
            const targetLabel = await LabelModel.findByPk(belowLabel);
            const belowLabels = await LabelModel.findAll({ where: { userId, order: { [Op.gt]: targetLabel?.order } } });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            maxOrder = targetLabel!.order + 1;
            for (const l of belowLabels) {
                await LabelModel.update({ order: l.order + 1 }, { where: { id: l.id } });
            }
        } else {
            maxOrder = await LabelModel.max<number, LabelModel>('order', {
                where: {
                    userId: userId
                }
            });
            maxOrder = (maxOrder || 0) + 1;
        }

        return LabelModel.create({
            title: prop.title,
            userId,
            order: maxOrder
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