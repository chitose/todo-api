import db from '@daos/sqlite3/sqlite-dao';
import { Association, DataTypes, Model } from 'sequelize';

import { ProjectModel, TaskModel } from '.';
import { autoIncrementIdColumn } from './columns';

/**
 * Section
 * @typedef {object} Section
 * @property {number} id - The section id
 * @property {string} name - The section name
 * @property {number} order - The section order
 * @property {number} projectId - The parent project's id
 * @property {boolean} open - The open or collapse state of the section
 * @property {array<Task>} tasks - The section's tasks
 */
export interface ISectionAttribute {
    id: number;
    name: string;
    projectId: number;
    order: number;
    open: boolean;
}

/**
 * Section creation info
 * @typedef {object} SectionCreation
 * @property {string} name - The section name
 * @property {number} order - The section order
 * @property {number} projectId - The parent project's id
 * @property {number} aboveSection - Insert section above specified section
 * @property {number} belowSectin - Insert section below specified section
 */
export interface ISectionCreationAttribute extends Omit<ISectionAttribute, 'id'> {
    aboveSection?: number;
    belowSection?: number;
}

export class SectionModel extends Model<ISectionAttribute, ISectionCreationAttribute> implements ISectionAttribute {
    public id!: number;
    public name!: string;
    public projectId!: number;
    public order!: number;
    public open!: boolean;

    public readonly tasks?: TaskModel[];

    public static associations: {
        tasks: Association<SectionModel, TaskModel>;
    }
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
        },
        open: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
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

export const ProjectSectionAssociation = ProjectModel.hasMany(SectionModel, { foreignKey: 'projectId', as: 'sections' });
export const SectionProjectAssociation = SectionModel.belongsTo(ProjectModel, { foreignKey: 'projectId', as: 'project' });