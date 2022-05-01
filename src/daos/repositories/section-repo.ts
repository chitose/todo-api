import { ISectionAttribute, ISectionCreationAttribute, SectionModel, SectionProjectAssociation } from '@daos/models/section';
import { getKey } from '@shared/utils';
import { Includeable, Op, Sequelize } from 'sequelize/dist';

import {
    ITaskSubTaskAttribute,
    ProjectModel,
    ProjectUserAssociation,
    SectionTaskAssociation,
    TaskModel,
    TaskSubTaskModel,
    UserModel,
} from '..';
import { IProjectRepository } from './project-repo';
import { ITaskRepository } from './task-repo';

export interface ISectionRepository {
    getSections(userId: string, projectId: number): Promise<SectionModel[]>;
    getSection(userId: string, projectId: number, sectId: number): Promise<SectionModel | null>;
    addSection(userId: string, projId: number, name: string, aboveSection?: number, belowSection?: number): Promise<SectionModel>;
    updateSection(userId: string, projId: number, sectId: number, prop: Partial<ISectionCreationAttribute>): Promise<SectionModel>;
    deleteSection(userId: string, projId: number, sectId: number): Promise<void>;
    duplicateSection(userId: string, projId: number, sectId: number): Promise<SectionModel | undefined>;
    moveSection(userId: string, projectId: number, sectId: number, targetProjectId: number): Promise<void>;
    swapOrder(userId: string, projectId: number, sectId: number, targetSectId: number): Promise<SectionModel[]>;
}

class SectionRepository implements ISectionRepository {
    constructor(private projectRepo: IProjectRepository, private taskRepo: ITaskRepository) { }

    async getSections(userId: string, projectId: number): Promise<SectionModel[]> {
        return SectionModel.findAll({
            where: {
                projectId: projectId,
            },
            order: [getKey<ISectionAttribute>('order')]
        });
    }

    async getSection(userId: string, projectId: number, sectId: number): Promise<SectionModel | null> {
        const sect = await SectionModel.findOne({
            where: {
                id: sectId,
                projectId: projectId,
            }
        });
        return sect;
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

    async addSection(userId: string, projId: number, name: string, aboveSection?: number, belowSection?: number): Promise<SectionModel> {
        await this.assertProjectCollaborator(userId, projId);
        let newOrder = -1;
        if (aboveSection) {
            const targetSection = await SectionModel.findOne({ where: { id: aboveSection } });
            // get all projects with order <= aboveProject
            const aboveSects = await SectionModel.findAll({ where: { order: { [Op.lt]: targetSection?.order } } });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            newOrder = targetSection!.order - 1;
            for (const s of aboveSects) {
                await SectionModel.update({ order: s.order - 1 }, { where: { id: s.id } });
            }
        } else if (belowSection) {
            const targetSection = await SectionModel.findOne({ where: { id: belowSection } });
            // get all projects with order > belowProject
            const belowSections = await SectionModel.findAll({ where: { order: { [Op.gt]: targetSection?.order } } });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            newOrder = targetSection!.order + 1;
            for (const s of belowSections) {
                await SectionModel.update({ order: s.order + 1 }, { where: { id: s.id } });
            }
        } else {

            const maxOrder = await SectionModel.max<number, SectionModel>('order', {
                where: {
                    projectId: {
                        [Op.eq]: projId
                    }
                }
            });
            newOrder = (maxOrder || 0) + 1;
        }

        return SectionModel.create({
            projectId: projId,
            name: name,
            order: newOrder,
            open: true
        });
    }

    async updateSection(userId: string, projId: number, sectId: number, prop: Partial<ISectionCreationAttribute>): Promise<SectionModel> {
        await this.assertProjectCollaborator(userId, projId);

        const updateProp = {} as Partial<ISectionCreationAttribute>;
        const { name, order, projectId, open } = prop;
        if (name !== undefined) {
            updateProp.name = name;
        }
        if (order !== null) {
            updateProp.order = order;
        }

        if (projectId !== undefined) {
            updateProp.projectId = projectId;
        }

        if (open !== undefined) {
            updateProp.open = open;
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

        const section = await this.getSection(userId, projId, sectId);


        if (!section) {
            throw new Error(`Section ${sectId} not found`);
        }

        const t = await SectionModel.sequelize?.transaction();
        try {
            const newSection = await this.addSection(userId, projId, `Copy of ${section.name}`);
            const tasks = (section.tasks || []).slice();
            const taskMap = new Map<number, number>();
            for (const task of tasks) {
                const duplicateTask = await this.taskRepo.createTask(userId, {
                    title: task.title,
                    description: task.description,
                    completed: task.completed,
                    projectId: task.projectId,
                    assignTo: task.assignTo,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    taskOrder: task.taskOrder,
                    labels: task.labels,
                    sectionId: newSection.id
                });
                taskMap.set(task.id, duplicateTask.id);
            }

            // duplicate relation ship of tasks
            const bulkCreate: ITaskSubTaskAttribute[] = [];

            for (const task of tasks) {
                if (task.parentTaskId !== null && task.parentTaskId !== undefined) {
                    bulkCreate.push({ taskId: taskMap.get(task.parentTaskId), subTaskId: taskMap.get(task.id) } as ITaskSubTaskAttribute);
                }
            }

            await TaskSubTaskModel.bulkCreate(bulkCreate);

            await t?.commit();

            return await this.getSection(userId, projId, newSection.id) as SectionModel;
        } catch (e) {
            await t?.rollback();
        }
    }
}

export function createSectionRepository(projectRepo: IProjectRepository, taskRepo: ITaskRepository) {
    return new SectionRepository(projectRepo, taskRepo);
}