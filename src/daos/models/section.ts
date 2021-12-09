import db from '@daos/sqlite3/sqlite-dao';
import { DataTypes, Model, Optional } from 'sequelize';

import { ProjectModel } from '.';
import { autoIncrementIdColumn } from './columns';

export interface ISectionAttribute {
    id: number;
    name: string;
    projectId: number;
    order: number;
}

export interface ISectionCreationAttribute extends Optional<ISectionAttribute, 'id'> { }

export class SectionModel extends Model<ISectionAttribute, ISectionCreationAttribute> implements ISectionAttribute {
    public id!: number;
    public name!: string;
    public projectId!: number;
    public order!: number;
}

export const SECTION_TABLE = 'section';

SectionModel.init(
    {
        id: autoIncrementIdColumn<SectionModel>(),
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        projectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: ProjectModel,
                key: 'id'
            }
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        tableName: SECTION_TABLE,
        sequelize: db,
        indexes: [
            {
                fields: ['name']
            }
        ]
    }
)

ProjectModel.hasMany(SectionModel, { foreignKey: 'projectId' });
SectionModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });