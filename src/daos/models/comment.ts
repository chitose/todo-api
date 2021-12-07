import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { UserModel } from './user';

export interface ICommentAttribute {
    id: number;
    comments: string;
    userId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICommentCreationAttributes extends Optional<ICommentAttribute, 'id'> { }

export const COMMENTS_TABLE = 'comments';

export class CommentModel extends Model<ICommentAttribute, ICommentCreationAttributes>
    implements ICommentAttribute {
    public id!: number;
    public comments!: string;
    public userId!: string;
}

CommentModel.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false
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