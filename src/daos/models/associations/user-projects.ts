import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model } from 'sequelize';

import { ProjectModel } from '../project';
import { UserModel } from '../user';


export interface IUserProjectInfo {
    id: string;
    props: {
        owner: boolean;
        order: number;
        favorite: boolean;
    }
}

/**
 * User 
 * @typedef {object} UserProject
 * @property {string} id - The user id
 * @property {UserProjectProp} props - The extra prop
 */

/**
 * User project prop
 * @typedef {object} UserProjectProp
 * @property {boolean} owner - True if user is the owner of the project
 * @property {number} order - The order of the project
 * @property {boolean} favorite - The favorite status of the project
 */
export interface IUserProjectsAttribute {
    userId: string;
    projectId: number;
    owner?: boolean;
    order: number;
    favorite?: boolean;
}
export class UserProjectsModel extends Model<IUserProjectsAttribute, IUserProjectsAttribute> implements IUserProjectsAttribute {
    public userId!: string;
    public projectId!: number;
    public owner?: boolean;
    public order!: number;
    public favorite?: boolean | undefined;
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
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        favorite: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
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