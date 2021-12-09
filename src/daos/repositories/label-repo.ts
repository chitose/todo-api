import { LABEL_TABLE, LabelModel, TASK_LABELS_TABLE, TASK_TABLE, TaskLabelModel, USER_PROJECTS_TABLE } from '@daos/models';
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
        return await LabelModel.create({
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
        return await LabelModel.findAll({
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
        FROM ${LABEL_TABLE} l left join ${TASK_LABELS_TABLE} tl up on l.id = tl.labelId
        left join ${TASK_TABLE} t on t.id = tl.taskId
        left jion ${USER_PROJECTS_TABLE} up on t.projectId = up.projectId AND up.userId =:userId
        WHERE tl.taskId = :taskId
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