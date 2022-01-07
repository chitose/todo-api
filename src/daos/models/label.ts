import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { UserModel } from '.';
import { autoIncrementIdColumn } from './columns';

/**
 * Label
 * @typedef {object} Label
 * @property {number} id - The label's id
 * @property {string} title - The title
 */
export interface ILabelAttribute {
    id: number;
    title: string;
    userId: string;
    order: number;
}


/**
 * Label creation info
 *
 * @typedef {object} LabelCreation
 * @property {string} title - The title
 * @property {number} aboveLabel - The id of label whose order > created label
 * @property {number} belowLabel - The id of label whose order < created label
 */
export interface ILabelCreationAttribute extends Optional<ILabelAttribute, 'id' | 'order' | 'userId'> {
    aboveLabel?: number;
    belowLabel?: number;
}

export class LabelModel extends Model<ILabelAttribute, ILabelCreationAttribute> implements ILabelAttribute {
    public id!: number;
    public title!: string;
    public userId!: string;
    public order!: number;
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
        },
        order: {
            type: DataTypes.NUMBER,
            allowNull: false,
            defaultValue: 0
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

LabelModel.belongsTo(UserModel, { foreignKey: 'userId' });
UserModel.hasMany(LabelModel, { foreignKey: 'userId' });