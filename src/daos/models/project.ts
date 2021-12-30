import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { CommentModel, IUserProjectInfo } from '.';
import { autoIncrementIdColumn } from './columns';

export enum ViewType {
    List = 1,
    Dashboard = 2
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
 */
export interface IProjectAttribute {
    id: number;
    name: string;
    view: ViewType;
    archived: boolean;
    defaultInbox: boolean;
    users?: IUserProjectInfo[];
}

/**
 * Project creation
 * @typedef {object} ProjectCreation
 * @property {string} name.required - The project name
 * @property {number} view - The view type (1 or 2)
 * @property {boolean} archived - The project archive status
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IProjectCreationAttributes extends Optional<IProjectAttribute, 'id' | 'defaultInbox'> { }

export class ProjectModel extends Model<IProjectAttribute, IProjectCreationAttributes>
    implements IProjectAttribute {
    public id!: number;
    public name!: string;
    public view!: ViewType;
    public archived!: boolean;

    public defaultInbox!: boolean;

    public readonly users?: IUserProjectInfo[];
    public readonly comments?: CommentModel[];
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