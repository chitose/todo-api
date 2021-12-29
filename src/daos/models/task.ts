import db from '@daos/sqlite3/sqlite-dao';
import { getKey } from '@shared/utils';
import { DataTypes, HasManyGetAssociationsMixin, Model } from 'sequelize';

import { ILabelAttribute, LabelModel, ProjectModel, UserModel } from '.';
import { autoIncrementIdColumn } from './columns';
import { SectionModel } from './section';

export enum TaskPriority {
    Priority1,
    Priority2,
    Priority3,
    Priority4
}

/**
 * Task creation info
 *
 * @typedef {object} TaskCreation
 * @property {string} title - The title
 * @property {description} - The task description
 * @property {string} dueDate - The task due date
 * @property {number} priority - The task priority (0-3)
 * @property {number} projectId - The project id
 * @property {string} assignTo - The user id
 * @property {number} sectionId - The section id
 * @property {boolean} completed - The task completion status
 * @property {number} taskOrder - The order of the task
 * @property {array<Label>} labels - The labels of the task
 * @property {number} parentTaskId - The id of parent task
 */
export interface ITaskCreationAttributes {
    title: string;
    description: string;
    dueDate?: Date;
    priority?: TaskPriority;
    projectId: number;
    assignTo?: string;
    sectionId?: number;
    completed: boolean;
    taskOrder?: number;
    labels?: Partial<ILabelAttribute>[];
    parentTaskId?: number;
    subTasks?: ITaskAttribute[];
}

/**
 * Task attribute
 *
 * @typedef {object} Task
 * @property {number} id - The task id
 * @property {string} title - The title
 * @property {description} - The task description
 * @property {string} dueDate - The task due date
 * @property {number} priority - The task priority (0-3)
 * @property {number} projectId - The project id
 * @property {string} assignTo - The user id
 * @property {number} sectionId - The section id
 * @property {boolean} completed - The task completion status
 * @property {number} taskOrder - The order of the task
 * @property {array<Label>} labels - The labels of the task
 * @property {array<object>} subTasks - The sub tasks.
 */
export interface ITaskAttribute extends ITaskCreationAttributes {
    id: number;
    taskOrder: number;
}

export class TaskModel extends Model<ITaskAttribute, ITaskCreationAttributes> implements ITaskAttribute {
    public taskOrder!: number;
    public id!: number;
    public title!: string;
    public description!: string;
    public dueDate?: Date | undefined;
    public priority?: TaskPriority | undefined;
    public projectId!: number;
    public assignTo?: string | undefined;
    public sectionId?: number | undefined;
    public completed!: boolean;

    public readonly labels?: LabelModel[];

    public readonly subTasks?: TaskModel[];

    public getSubTasks!: HasManyGetAssociationsMixin<TaskModel>;
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
                fields: [getKey<ITaskAttribute>('title'), getKey<ITaskAttribute>('description')]
            }
        ]
    });

export const ProjectTaskAssociation = ProjectModel.hasMany(TaskModel, { foreignKey: 'projectId', as: 'tasks' });
export const TaskProjectAssociation = TaskModel.belongsTo(ProjectModel, { foreignKey: 'projectId', as: 'project' });

export const SectionTaskAssociation = SectionModel.hasMany(TaskModel, { foreignKey: 'sectionId', as: 'tasks' });
export const TaskSectionAssociation = TaskModel.belongsTo(SectionModel, { foreignKey: 'sectionId', as: 'section' });

export interface ITaskSubTaskAttribute {
    taskId: number;
    subTaskId: number;
}

export class TaskSubTaskModel extends Model<ITaskSubTaskAttribute, ITaskSubTaskAttribute> implements ITaskSubTaskAttribute {
    public taskId!: number;
    public subTaskId!: number;
}

TaskSubTaskModel.init({
    taskId: {
        type: DataTypes.INTEGER,
        references: {
            model: TaskModel,
            key: 'id'
        }
    },
    subTaskId: {
        type: DataTypes.INTEGER,
        references: {
            model: TaskModel,
            key: 'id'
        }
    }
}, {
    tableName: 'sub_tasks',
    sequelize: db,
    indexes: [
        {
            fields: [getKey<ITaskSubTaskAttribute>('taskId'), getKey<ITaskSubTaskAttribute>('subTaskId')]
        }
    ]
});

export const TaskSubTaskAssociation = TaskModel.belongsToMany(TaskModel, { as: 'subTasks', through: TaskSubTaskModel, foreignKey: 'taskId', otherKey: 'subTaskId' });