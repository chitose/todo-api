import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { ProjectModel } from '../project';
import { UserModel } from '../user';

export interface IUserProjectsAttribute {
    id: number;
    userId: string;
    projectId: number;
}

export interface IUserProjectsCreationAttributes extends Optional<IUserProjectsAttribute, 'id'> { }

export class UserProjectsModel extends Model<IUserProjectsAttribute, IUserProjectsCreationAttributes> implements IUserProjectsAttribute {
    public id!: number;
    public userId!: string;
    public projectId!: number;
}

export const USER_PROJECTS_TABLE = 'user_projects';

UserProjectsModel.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING(255),
            references: {
                model: UserModel,
                key: 'id'
            }
        },
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                model: ProjectModel,
                key: 'id'
            }
        }
    },
    {
        tableName: USER_PROJECTS_TABLE,
        sequelize: db
    });

// relation ship
UserModel.belongsToMany(ProjectModel, { through: UserProjectsModel, foreignKey: 'userId' });
ProjectModel.belongsToMany(UserModel, { through: UserProjectsModel, foreignKey: 'projectId' });