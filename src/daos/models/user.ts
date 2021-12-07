/* eslint-disable quotes */
import { DataTypes, Model } from 'sequelize';

import db from '../sqlite3/sqlite-dao';

export interface IUserAttribute {
    id: string;
    displayName: string;
    email: string | null;
    photo: string | null;
}

export class UserModel extends Model<IUserAttribute, IUserAttribute> implements IUserAttribute {
    public id!: string;
    public displayName!: string;
    public email!: string | null;
    public photo!: string | null;
}

export const USERS_TABLE = "users";

UserModel.init(
    {
        id: {
            type: DataTypes.STRING(255),
            primaryKey: true,
            allowNull: false
        },
        displayName: {
            type: DataTypes.STRING(255)
        },
        photo: {
            type: DataTypes.STRING(1000),
            allowNull: true
        },
        email: {
            type: DataTypes.STRING(1000),
            allowNull: true
        }
    },
    {
        tableName: USERS_TABLE,
        sequelize: db,
        indexes: [
            {
                fields: ['id']
            },
            {
                fields: ['displayName']
            },
            {
                fields: ['email']
            }
        ]
    });