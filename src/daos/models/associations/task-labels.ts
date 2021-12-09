import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { autoIncrementIdColumn } from '../columns';
import { LabelModel } from '../label';
import { TaskModel } from '../task';

export interface ITaskLabelAttribute {
    id: number;
    taskId: number;
    labelId: number;
}

export interface ITaskLabelCreationAttribute extends Optional<ITaskLabelAttribute, 'id'> { }

export class TaskLabelModel extends Model<ITaskLabelAttribute, ITaskLabelCreationAttribute> implements ITaskLabelAttribute {
    public id!: number;
    public taskId!: number;
    public labelId!: number;
}

export const TASK_LABELS_TABLE = 'task_labels';

TaskLabelModel.init(
    {
        id: autoIncrementIdColumn<TaskLabelModel>(),
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

TaskModel.belongsToMany(LabelModel, { through: TaskLabelModel, foreignKey: 'taskId' });
LabelModel.belongsToMany(TaskModel, { through: TaskLabelModel, foreignKey: 'labelId' });