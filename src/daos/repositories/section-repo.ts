import { ISectionCreationAttribute, SectionModel } from '@daos/models/section';
import { Op } from 'sequelize/dist';

import { IProjectRepository } from './project-repo';

export interface ISectionRepository {
    addSection(userId: string, projId: number, name: string): Promise<SectionModel>;
    updateSection(userId: string, projId: number, sectId: number, prop: Partial<ISectionCreationAttribute>): Promise<SectionModel>;
    deleteSection(userId: string, projId: number, sectId: number): Promise<void>;
    duplicateSection(userId: string, projId: number, sectId: number): Promise<SectionModel>;
    moveSection(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void>;
}

class SectionRepository implements ISectionRepository {
    constructor(private projectRepo: IProjectRepository) { }

    async moveSection(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void> {
        await this.assertProjectCollaborator(userId, projectId);
        await this.assertProjectCollaborator(userId, targetProjectId);
        await this.updateSection(userId, projectId, sectId, { projectId: targetProjectId });
    }

    private async assertProjectCollaborator(userId: string, projId: number) {
        const proj = await this.projectRepo.get(userId, projId);
        if (!proj) {
            throw new Error('Project not found or you are not its collaborator');
        }
    }

    async addSection(userId: string, projId: number, name: string): Promise<SectionModel> {
        await this.assertProjectCollaborator(userId, projId);
        const maxOrder = await SectionModel.max<number, SectionModel>('order', {
            where: {
                projectId: {
                    [Op.eq]: projId
                }
            }
        });

        return SectionModel.create({
            projectId: projId,
            name: name,
            order: (maxOrder || 0) + 1
        });
    }

    async updateSection(userId: string, projId: number, sectId: number, prop: Partial<ISectionCreationAttribute>): Promise<SectionModel> {
        await this.assertProjectCollaborator(userId, projId);

        const updateProp = {} as Partial<ISectionCreationAttribute>;
        const { name, order, projectId } = prop;
        if (name !== undefined) {
            updateProp.name = name;
        }
        if (order !== null) {
            updateProp.order = order;
        }

        if (projectId !== undefined) {
            updateProp.projectId = projectId;
        }

        await SectionModel.update(updateProp, {
            where: {
                [Op.and]: {
                    projectId: { [Op.eq]: projId },
                    id: { [Op.eq]: sectId }
                }
            }
        });

        return await SectionModel.findOne({
            where: {
                id: { [Op.eq]: sectId }
            }
        }) as SectionModel;
    }

    async deleteSection(userId: string, projId: number, sectId: number): Promise<void> {
        await this.assertProjectCollaborator(userId, projId);

        await SectionModel.destroy({
            where: {
                id: { [Op.eq]: sectId }
            }
        })
    }

    duplicateSection(userId: string, projId: number, sectId: number): Promise<SectionModel> {
        throw new Error('Method not implemented.');
    }
}

export function createSectionRepository(projectRepo: IProjectRepository) {
    return new SectionRepository(projectRepo);
}