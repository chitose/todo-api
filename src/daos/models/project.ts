import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { autoIncrementIdColumn } from './columns';

export enum ViewType {
    List = 1,
    Dashboard = 2
}

export interface IProjectAttribute {
    id: number;
    name: string;
    view: ViewType;
    archived: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IProjectCreationAttributes extends Optional<IProjectAttribute, 'id'> { }

export class ProjectModel extends Model<IProjectAttribute, IProjectCreationAttributes>
    implements IProjectAttribute {
    public id!: number;
    public name!: string;
    public view!: ViewType;
    public archived!: boolean;
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