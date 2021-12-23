import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model } from 'sequelize';

import { LabelModel } from '../label';
import { TaskModel } from '../task';

export interface ITaskLabelAttribute {
    taskId: number;
    labelId: number;
}

export class TaskLabelModel extends Model<ITaskLabelAttribute, ITaskLabelAttribute> implements ITaskLabelAttribute {
    public taskId!: number;
    public labelId!: number;
}

export const TASK_LABELS_TABLE = 'task_labels';

TaskLabelModel.init(
    {
        taskId: {
            type: DataTypes.INTEGER,
            references: {
                model: TaskModel,
                key: 'id'
            }
        },
        labelId: {
            type: DataTypes.INTEGER,
            references: {
                model: LabelModel,
                key: 'id'
            }
        }
    },
    {
        tableName: TASK_LABELS_TABLE,
        sequelize: db
    }
);

export const TaskLabelAssociation = TaskModel.belongsToMany(LabelModel, { as: 'labels', through: TaskLabelModel, foreignKey: 'taskId', otherKey: 'labelId' });
export const LabelTaskAssociation = LabelModel.belongsToMany(TaskModel, { as: 'tasks', through: TaskLabelModel, foreignKey: 'labelId', otherKey: 'taskId' });