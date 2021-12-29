import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model } from 'sequelize';

import { ProjectModel } from '.';
import { autoIncrementIdColumn } from './columns';
import { TaskModel } from './task';
import { UserModel } from './user';

/**
 * Comment
 * @typedef {object} Comment
 *
 * @property {number} id - Comment's id
 * @property {string} comments - Comment text.
 * @property {string} commentDate - The date where comment is added
 * @property {number} projectId - The id of project (comment of project)
 * @property {number} taskId - The task id (comment of task)
 */
export interface ICommentAttribute {
    id: number;
    comments: string;
    userId: string;
    commentDate: Date;
    projectId: number;
    taskId?: number;
}


/**
 * Comment creation
 * @typedef {object} CommentCreation
 * @property {string} comments - Comment text.
 * @property {number} projectId - The id of project (comment of project)
 * @property {number} taskId - The task id (comment of task)
 * */
interface ICommentCreationAttributes extends Omit<ICommentAttribute, 'id'> { }

/**
 * Project comment creation info
 * @typedef {object} ProjectCommentCreation
 * @property {string} comments - Comment text.
 * @property {number} projectId - The id of project (comment of project)
 */
export interface IProjectCommentCreationAttributes extends Omit<ICommentAttribute, 'taskId' | 'id' | 'commentDate'> {
}

/**
 * Task comment creation info
 * @typedef {object} TaskCommentCreation
 * @property {string} comments - Comment text.
 * @property {number} taskId - The id of task
 */
export interface ITaskCommentCreationAttribute extends Omit<ICommentAttribute, 'projectId' | 'id' | 'commentDate'> {
}

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