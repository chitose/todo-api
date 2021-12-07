import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { CommentModel } from './comment';
import { ProjectModel } from './project';
import { UserModel } from './user';

interface IUserProjectsAttribute {
    id: number;
    userId: string;
    projectId: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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


interface IProjectCommentsAttribute {
    id: number;
    commentId: number;
    projectId: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IProjectCommentsCreationAttributes extends Optional<IProjectCommentsAttribute, 'id'> { }

export class ProjectCommentsModel extends Model<IProjectCommentsAttribute, IProjectCommentsCreationAttributes> implements IProjectCommentsAttribute {
    public id!: number;
    public commentId!: number;
    public projectId!: number;
}

export const PROJECT_COMMENTS_TABLE = 'project_comments';
ProjectCommentsModel.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        commentId: {
            type: DataTypes.INTEGER,
            references: {
                model: CommentModel,
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
        tableName: PROJECT_COMMENTS_TABLE,
        sequelize: db
    });

// relation ship
CommentModel.belongsToMany(ProjectModel, { through: ProjectCommentsModel, foreignKey: 'commentId', onDelete: 'CASCADE' });
ProjectModel.belongsToMany(CommentModel, { through: ProjectCommentsModel, foreignKey: 'projectId', onDelete: 'CASCADE' });


export * from './project';
export * from './user';
export * from './comment';