import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { UserModel } from '.';
import { autoIncrementIdColumn } from './columns';

export interface ILabelAttribute {
    id: number;
    title: string;
    userId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ILabelCreationAttribute extends Optional<ILabelAttribute, 'id'> { }

export class LabelModel extends Model<ILabelAttribute, ILabelCreationAttribute> implements ILabelAttribute {
    public id!: number;
    public title!: string;
    public userId!: string;
}

export const LABEL_TABLE = 'label';

LabelModel.init(
    {
        id: autoIncrementIdColumn<LabelModel>(),
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: UserModel,
                key: 'id'
            }
        }
    },
    {
        tableName: LABEL_TABLE,
        sequelize: db,
        indexes: [
            {
                fields: ['title']
            }
        ]
    });

LabelModel.belongsTo(UserModel);
UserModel.hasMany(LabelModel, { foreignKey: 'userId' });