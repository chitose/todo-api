import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { ProjectModel } from '.';
import { autoIncrementIdColumn } from './columns';
import { TaskModel } from './task';
import { UserModel } from './user';

export interface ICommentAttribute {
    id: number;
    comments: string;
    userId: string;
    commentDate: Date;
    projectId: number;
    taskId?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICommentCreationAttributes extends Optional<ICommentAttribute, 'id'> { }

export const COMMENTS_TABLE = 'comments';

export class CommentModel extends Model<ICommentAttribute, ICommentCreationAttributes>
    implements ICommentAttribute {
    public commentDate!: Date;
    public projectId!: number;
    public taskId?: number | undefined;
    public id!: number;
    public comments!: string;
    public userId!: string;
}

CommentModel.init(
    {
        id: autoIncrementIdColumn<CommentModel>(),
        comments: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        commentDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: UserModel,
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
        taskId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: TaskModel,
                key: 'id'
            }
        }
    },
    {
        tableName: COMMENTS_TABLE,
        sequelize: db,
        indexes: [
            {
                fields: ['comments']
            }
        ]
    });

UserModel.hasMany(CommentModel, { foreignKey: 'userId' });
CommentModel.belongsTo(UserModel, { foreignKey: 'userId' });
TaskModel.hasMany(CommentModel, { foreignKey: 'taskId' });
CommentModel.belongsTo(TaskModel, { foreignKey: 'taskId' });
ProjectModel.hasMany(CommentModel, { foreignKey: 'projectId' });
CommentModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });