import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { CommentModel, IUserProjectInfo, TaskModel } from '.';
import { autoIncrementIdColumn } from './columns';
import { SectionModel } from './section';

export enum ViewType {
    List = 1,
    Dashboard = 2
}

/**
 * Project creation
 * @typedef {object} ProjectCreation
 * @property {string} name.required - The project name
 * @property {number} view - The view type (1 or 2)
 * @property {number} aboveProject - The id of project that this project will be created with less order
 * @property {number} belowProject - THe id of project that this project will be created with greater order
 */
export interface IProjectCreationAttributes {
    name: string;
    view: ViewType;
    aboveProject?: number;
    belowProject?: number;
    archived?: boolean;
    defaultInbox?: boolean;
}

/**
 * Project update info
 * @typedef {object} ProjectModification
 * @property {string} name.required - The project name
 * @property {number} view - The view type (1 or 2)
 * @property {string} groupBy - The column to group tasks
 * @property {string} sortBy - The column to sort tasks
 * @property {string} sortDir - The sort direction, Asc or Desc
 * @property {boolean} showCompleted - Show / hide completed tasks
 */
export interface IProjectUpdateAttributes extends Omit<IProjectCreationAttributes, 'aboveProject' | 'belowProject'> {
    groupBy?: string;
    sortBy?: string;
    sortDir?: string;
    showCompleted?: boolean;
}

/**
 * A project
 * @typedef {object} Project
 * @property {number} id - The project id
 * @property {string} name - The project name
 * @property {number} view - The view type (1 or 2)
 * @property {boolean} archived - The project archive status
 * @property {boolean} defaultInbox - The default Inbox project
 * @property {string} createdAt - The created date
 * @property {string} modifiedAt - The modified date
 * @property {array<UserProject>} users - The project extra info
 * @property {number} taskCount - The total tasks in the project
 * @property {string} groupBy - The column to group tasks
 * @property {string} sortBy - The column to sort tasks
 * @property {string} sortDir - The sort direction, Asc or Desc
 * @property {boolean} showCompleted - Show / hide completed tasks
 */
export interface IProjectAttribute extends IProjectUpdateAttributes {
    id: number;
    users?: IUserProjectInfo[];
    taskCount?: number;
}

export class ProjectModel extends Model<IProjectAttribute, IProjectCreationAttributes & IProjectUpdateAttributes>
    implements IProjectAttribute {
    public id!: number;
    public name!: string;
    public view!: ViewType;
    public archived!: boolean;

    public defaultInbox!: boolean;
    public groupBy?: string | undefined;
    public sortBy?: string | undefined;
    public sortDir = 'Asc';
    public showCompleted = false;

    public readonly users?: IUserProjectInfo[];
    public readonly comments?: CommentModel[];
    public getSections!: () => Promise<SectionModel[]>;
    public getTasks!: () => Promise<TaskModel[]>;
}

export const PROJECTS_TABLE = 'projects';

ProjectModel.init(
    {
        id: autoIncrementIdColumn<ProjectModel>(),
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        view: {
            type: DataTypes.SMALLINT,
            allowNull: false
        },
        archived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        defaultInbox: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        groupBy: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: ''
        },
        sortBy: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: ''
        },
        sortDir: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'Asc'
        },
        showCompleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
    tableName: PROJECTS_TABLE,
    sequelize: db,
    indexes: [
        {
            fields: ['name']
        }, {
            fields: ['archived']
        }
    ]
});