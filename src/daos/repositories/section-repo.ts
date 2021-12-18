import { ISectionAttribute, ISectionCreationAttribute, SECTION_TABLE, SectionModel } from '@daos/models/section';
import { getKey } from '@shared/utils';
import { Op, QueryTypes } from 'sequelize/dist';

import { IUserProjectsAttribute, TaskModel, USER_PROJECTS_TABLE } from '..';
import { IProjectRepository } from './project-repo';
import { ITaskRepository } from './task-repo';

export interface ISectionRepository {
    getSections(userId: string, projectId: number): Promise<SectionModel[]>;
    getSection(userId: string, projectId: number, sectId: number): Promise<SectionModel>;
    addSection(userId: string, projId: number, name: string): Promise<SectionModel>;
    updateSection(userId: string, projId: number, sectId: number, prop: Partial<ISectionCreationAttribute>): Promise<SectionModel>;
    deleteSection(userId: string, projId: number, sectId: number): Promise<void>;
    duplicateSection(userId: string, projId: number, sectId: number): Promise<SectionModel | undefined>;
    moveSection(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void>;
    swapOrder(userId: string, projectId: number, sectId: number, targetSectId: number): Promise<SectionModel[]>;
}

class SectionRepository implements ISectionRepository {
    constructor(private projectRepo: IProjectRepository, private taskRepo: ITaskRepository) { }

    async getSections(userId: string, projectId: number): Promise<SectionModel[]> {
        return await SectionModel.sequelize!.query(`
        SELECT s.* FROM ${SECTION_TABLE} s
        LEFT JOIN ${USER_PROJECTS_TABLE} up on up.${getKey<IUserProjectsAttribute>('projectId')} = s.${getKey<ISectionAttribute>('projectId')}
        WHERE s.${getKey<ISectionAttribute>('projectId')} = :projectId AND up.${getKey<IUserProjectsAttribute>('userId')} = :userId
        `, {
            model: SectionModel,
            mapToModel: true,
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                projectId
            }
        });
    }

    async getSection(userId: string, projectId: number, sectId: number): Promise<SectionModel> {
        const sections = await SectionModel.sequelize!.query(`
        SELECT s.* FROM ${SECTION_TABLE} s
        LEFT JOIN ${USER_PROJECTS_TABLE} up on up.${getKey<IUserProjectsAttribute>('projectId')} = s.${getKey<ISectionAttribute>('projectId')}
        WHERE s.${getKey<ISectionAttribute>('id')} = :sectId AND s.${getKey<ISectionAttribute>('projectId')} = :projectId
        AND up.${getKey<IUserProjectsAttribute>('userId')} = :userId
        `, {
            model: SectionModel,
            mapToModel: true,
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                projectId,
                sectId
            }
        });

        return sections[0];
    }

    async swapOrder(userId: string, projectId: number, sectId: number, targetSectId: number): Promise<SectionModel[]> {
        await this.assertProjectCollaborator(userId, projectId);
        const sourceSect = await this.getSection(userId, projectId, sectId);
        if (!sourceSect) {
            throw new Error(`Section ${sectId} not found`);
        }
        const targetSect = await this.getSection(userId, projectId, targetSectId);
        if (!targetSect) {
            throw new Error(`Section ${targetSectId} not found`);
        }
        const t = await SectionModel.sequelize?.transaction();
        try {
            const sourceOrder = sourceSect.order;
            const targetOrder = targetSect.order;
            await targetSect.update({
                order: sourceOrder
            });
            await sourceSect.update({
                order: targetOrder
            });
            await t?.commit();
            return [sourceSect, targetSect];
        } catch (e) {
            t?.rollback();
            return [];
        }
    }

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

    async duplicateSection(userId: string, projId: number, sectId: number): Promise<SectionModel | undefined> {
        await this.assertProjectCollaborator(userId, projId);

        const section = await SectionModel.findOne({
            where: {
                id: { [Op.eq]: sectId }
            },
            include: [SectionModel.associations.tasks],
        });


        if (!section) {
            throw new Error(`Section ${sectId} not found`);
        }

        const t = await SectionModel.sequelize?.transaction();
        try {
            const newSection = await this.addSection(userId, projId, section.name);
            const rootTasks = section.tasks?.filter(t => !t.parentTaskId) as TaskModel[];
            const childTasks = section.tasks?.filter(t => t.parentTaskId) as TaskModel[];
            const parentTaskMap = new Map<number, number>();
            for (const t of rootTasks) {
                const duplicateRootTask = await this.taskRepo.createTask(userId, {
                    title: t.title,
                    description: t.description,
                    completed: t.completed,
                    projectId: t.projectId,
                    assignTo: t.assignTo,
                    dueDate: t.dueDate,
                    priority: t.priority,
                    taskOrder: t.taskOrder,
                    sectionId: newSection.id
                });
                parentTaskMap.set(t.id, duplicateRootTask.id);
            }

            for (const t of childTasks) {
                await this.taskRepo.createTask(userId, {
                    title: t.title,
                    description: t.description,
                    completed: t.completed,
                    projectId: t.projectId,
                    assignTo: t.assignTo,
                    dueDate: t.dueDate,
                    priority: t.priority,
                    taskOrder: t.taskOrder,
                    sectionId: newSection.id,
                    parentTaskId: parentTaskMap.get(t.parentTaskId!)
                });
            }

            await t?.commit();

            return await SectionModel.findOne({
                where: {
                    id: { [Op.eq]: newSection.id }
                }, include: [SectionModel.associations.tasks]
            }) as SectionModel;
        } catch (e) {
            await t?.rollback();
        }
    }
}

export function createSectionRepository(projectRepo: IProjectRepository, taskRepo: ITaskRepository) {
    return new SectionRepository(projectRepo, taskRepo);
}