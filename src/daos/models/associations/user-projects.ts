import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model } from 'sequelize';

import { ProjectModel } from '../project';
import { UserModel } from '../user';

export interface IUserProjectsAttribute {
    userId: string;
    projectId: number;
    owner?: boolean;
}
export class UserProjectsModel extends Model<IUserProjectsAttribute, IUserProjectsAttribute> implements IUserProjectsAttribute {
    public userId!: string;
    public projectId!: number;
    public owner?: boolean;
}

export const USER_PROJECTS_TABLE = 'user_projects';

UserProjectsModel.init(
    {
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
        },
        owner: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: USER_PROJECTS_TABLE,
        sequelize: db
    });

// relation ship
export const UserProjectAssociation = UserModel.belongsToMany(ProjectModel, { through: UserProjectsModel, foreignKey: 'userId', as: 'projects' });
export const ProjectUserAssociation = ProjectModel.belongsToMany(UserModel, { through: UserProjectsModel, foreignKey: 'projectId', as: 'users' });