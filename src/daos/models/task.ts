import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { ProjectModel, UserModel } from '.';
import { autoIncrementIdColumn } from './columns';
import { SectionModel } from './section';

export enum TaskPriority {
    Priority1,
    Priority2,
    Priority3,
    Priority4
}

export interface ITaskAttribute {
    id: number;
    title: string;
    description: string;
    dueDate?: Date;
    priority?: TaskPriority;
    parentTaskId?: number;
    projectId: number;
    assignTo?: string;
    sectionId?: number;
    completed: boolean;
    taskOrder: number;
}

export interface ITaskCreationAttributes extends Optional<ITaskAttribute, 'id'> { }

export class TaskModel extends Model<ITaskAttribute, ITaskCreationAttributes> implements ITaskAttribute {
    public taskOrder!: number;
    public id!: number;
    public title!: string;
    public description!: string;
    public dueDate?: Date | undefined;
    public priority?: TaskPriority | undefined;
    public parentTaskId?: number | undefined;
    public projectId!: number;
    public assignTo?: string | undefined;
    public sectionId?: number | undefined;
    public completed!: boolean;
}

export const TASK_TABLE = 'task';

TaskModel.init(
    {
        id: autoIncrementIdColumn<TaskModel>(),
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        priority: {
            type: DataTypes.SMALLINT,
            allowNull: true
        },
        completed: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        taskOrder: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        parentTaskId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: TaskModel,
                key: 'id'
            }
        },
        projectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: ProjectModel,
                key: 'id'
            }
        },
        assignTo: {
            type: DataTypes.STRING,
            allowNull: true,
            references: {
                model: UserModel,
                key: 'id'
            }
        },
        sectionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: SectionModel,
                key: 'id'
            }
        }
    },
    {
        tableName: TASK_TABLE,
        sequelize: db,
        indexes: [
            {
                fields: ['title', 'description']
            }
        ]
    });

UserModel.hasMany(TaskModel, { foreignKey: 'userId' });
TaskModel.belongsTo(UserModel, { foreignKey: 'userId' });

ProjectModel.hasMany(TaskModel, { foreignKey: 'projectId' });
TaskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

SectionModel.hasMany(TaskModel, { foreignKey: 'sectionId' });
TaskModel.belongsTo(SectionModel, { foreignKey: 'sectionId' });