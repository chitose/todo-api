import {
    CommentModel,
    IProjectCreationAttributes,
    ITaskSubTaskAttribute,
    IUserAttribute,
    IUserProjectsAttribute,
    ProjectCommentAssociation,
    ProjectModel,
    ProjectUserAssociation,
    TaskSubTaskModel,
    UserModel,
    UserProjectsModel,
} from '@daos/models';
import { SectionModel } from '@daos/models/section';
import { getKey } from '@shared/utils';
import { Op } from 'sequelize';

import { ITaskRepository } from './task-repo';

export interface IProjectRepository {
    taskRepo: ITaskRepository;

    duplicateProject(userId: string, projectId: number): Promise<ProjectModel>;

    search(userId: string, text: string): Promise<ProjectModel[]>;

    createProject(userId: string, proj: IProjectCreationAttributes): Promise<ProjectModel | null>;

    shareProject(userId: string, projId: number, sharedWithUsers: string[]): Promise<void>;

    get(userId: string, projId: number): Promise<ProjectModel | null>;

    getProjects(userId: string): Promise<ProjectModel[]>;

    getArchivedProjects(userId: string): Promise<ProjectModel[]>;

    deleteProject(userId: string, projId: number): Promise<void>;

    updateProject(userId: string, projectId: number, prop: Partial<IProjectCreationAttributes>): Promise<ProjectModel>;

    swapProjectOrder(userId: string, sourceProject: number, targetProject: number): Promise<ProjectModel[]>;

    addToFavorite(userId: string, projectId: number): Promise<void>;

    removeFavorite(userId: string, projectId: number): Promise<void>;

    leaveProject(userId: string, projectId: number): Promise<void>;
}

class ProjectRepository implements IProjectRepository {
    public taskRepo!: ITaskRepository;

    async duplicateProject(userId: string, projectId: number): Promise<ProjectModel> {
        const prj = await this.get(userId, projectId);

        if (!prj) {
            throw new Error('Project not found');
        }

        const t = await ProjectModel.sequelize?.transaction();
        try {

            const dupProj = await this.createProject(userId, {
                name: `Copy of ${prj?.name}`,
                view: prj.view,
                archived: prj.archived,
                defaultInbox: false
            });

            const sectionMap = new Map<number, number>();
            const taskMap = new Map<number, number>();

            const sections = await prj.getSections();
            for (const sect of sections) {
                const dupSect = await SectionModel.create({
                    name: sect.name,
                    projectId: dupProj!.id,
                    order: sect.order
                });
                sectionMap.set(sect.id, dupSect.id);
            }
            const tasks = await prj.getTasks();

            for (const task of tasks) {
                const duplicateTask = await this.taskRepo.createTask(userId, {
                    title: task.title,
                    description: task.description,
                    completed: task.completed,
                    projectId: task.projectId,
                    assignTo: task.assignTo,
                    dueDate: task.dueDate,
                    labels: task.labels,
                    priority: task.priority,
                    taskOrder: task.taskOrder,
                    sectionId: task.sectionId ? sectionMap.get(task.sectionId) : undefined
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

            return dupProj as ProjectModel;
        } catch (e) {
            await t?.rollback();
            throw e;
        }
    }

    async leaveProject(userId: string, projectId: number): Promise<void> {
        const projs = await UserProjectsModel.findAll({ where: { projectId: projectId } });
        if (!projs.find(p => p.userId === userId)) {
            throw new Error('Project not found');
        }

        if (projs.length === 1) {
            throw new Error('You cannot leave the project without other collaborators');
        }

        await UserProjectsModel.destroy({ where: { userId, projectId } });
    }

    async addToFavorite(userId: string, projectId: number): Promise<void> {
        const proj = await UserProjectsModel.findOne({ where: { userId: userId, projectId: projectId } });
        if (!proj) {
            throw new Error('Project not found');
        }

        await UserProjectsModel.update({ favorite: true }, { where: { userId: userId, projectId: projectId } });
    }

    async removeFavorite(userId: string, projectId: number): Promise<void> {
        const proj = await UserProjectsModel.findOne({ where: { userId: userId, projectId: projectId } });
        if (!proj) {
            throw new Error('Project not found');
        }

        await UserProjectsModel.update({ favorite: false }, { where: { userId: userId, projectId: projectId } });
    }
    async swapProjectOrder(userId: string, sourceProject: number, targetProject: number): Promise<ProjectModel[]> {
        const projects = await UserProjectsModel.findAll({
            where: {
                projectId: { [Op.in]: [sourceProject, targetProject] },
                userId: userId
            }
        });
        if (projects.length === 2) {
            const oldOrder = projects[0].order;
            await UserProjectsModel.update({ order: projects[1].order }, { where: { userId: userId, projectId: projects[0].projectId } });
            await UserProjectsModel.update({ order: oldOrder }, { where: { userId: userId, projectId: projects[1].projectId } });
        }
        return ProjectModel.findAll({
            where: {
                id: { [Op.in]: [sourceProject, targetProject] },
            },
            include: this.getCommonProjectInclude(userId)
        });
    }

    async search(userId: string, text: string): Promise<ProjectModel[]> {
        return ProjectModel.findAll({
            where: {
                name: { [Op.like]: `%${text}%` }
            },
            include: {
                model: UserModel,
                where: {
                    id: userId
                },
                as: ProjectUserAssociation.as,
                attributes: [],
                through: {
                    attributes: []
                }
            }
        });
    }

    async updateProject(userId: string, projectId: number, prop: Partial<IProjectCreationAttributes>): Promise<ProjectModel> {
        const { archived, name } = prop;
        const proj = await this.get(userId, projectId);
        if (!proj) {
            throw new Error('Project not found');
        }

        const updateProp: Partial<IProjectCreationAttributes> = {
        };

        if (archived !== undefined) {
            updateProp.archived = archived;
        }

        if (name !== undefined) {
            updateProp.name = name;
        }

        await ProjectModel.update(updateProp, { where: { id: projectId } });
        return this.get(userId, projectId) as unknown as ProjectModel;
    }

    async deleteProject(userId: string, projId: number): Promise<void> {
        const proj = await ProjectModel.findOne({
            where: {
                id: projId
            },
            include: [{
                model: CommentModel,
                as: ProjectCommentAssociation.as
            },
            {
                model: UserModel,
                required: true,
                as: ProjectUserAssociation.as,
                attributes: [],
                through: {
                    attributes: [],
                    where: {
                        userId: userId,
                        owner: true
                    }
                }
            }]
        }) as ProjectModel;

        if (!proj) {
            throw new Error('Project not found');
        }

        if (proj.defaultInbox) {
            throw new Error('Default Inbox cannot be delete');
        }

        await ProjectModel.destroy({
            where: {
                id: projId
            }
        });
    }

    private getCommonProjectInclude(userId: string) {
        return {
            model: UserModel,
            where: {
                id: userId
            },
            as: ProjectUserAssociation.as,
            attributes: [getKey<IUserAttribute>('id')],
            through: {
                as: 'props',
                attributes: [getKey<IUserProjectsAttribute>('owner'), getKey<IUserProjectsAttribute>('order'), getKey<IUserProjectsAttribute>('favorite')]
            }
        };
    }

    async getProjects(userId: string): Promise<ProjectModel[]> {
        return ProjectModel.findAll({
            where: {
                archived: false
            },
            include: this.getCommonProjectInclude(userId)
        });
    }

    async getArchivedProjects(userId: string): Promise<ProjectModel[]> {
        return ProjectModel.findAll({
            where: {
                archived: true
            },
            include: this.getCommonProjectInclude(userId)
        });
    }

    async createProject(userId: string, proj: IProjectCreationAttributes): Promise<ProjectModel | null> {
        const t = await ProjectModel.sequelize?.transaction();
        try {
            const { name, archived, view, aboveProject, belowProject, defaultInbox } = proj;
            const rProj = await ProjectModel.create({ name, view, archived, defaultInbox });
            let order = 0;
            if (aboveProject) {
                const targetProject = await UserProjectsModel.findOne({ where: { userId, projectId: aboveProject } });
                // get all projects with order <= aboveProject
                const aboveProjects = await UserProjectsModel.findAll({ where: { userId, order: { [Op.lt]: targetProject?.order } } });
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                order = targetProject!.order - 1;
                for (const p of aboveProjects) {
                    await UserProjectsModel.update({ order: p.order - 1 }, { where: { userId, projectId: p.projectId } });
                }
            } else if (belowProject) {
                const targetProject = await UserProjectsModel.findOne({ where: { userId, projectId: belowProject } });
                // get all projects with order > belowProject
                const belowProjects = await UserProjectsModel.findAll({ where: { userId, order: { [Op.gt]: targetProject?.order } } });
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                order = targetProject!.order + 1;
                for (const p of belowProjects) {
                    await UserProjectsModel.update({ order: p.order + 1 }, { where: { userId, projectId: p.projectId } });
                }
            } else {
                order = (await UserProjectsModel.max<number, UserProjectsModel>('order', {
                    where: {
                        userId: userId
                    }
                }) || 0) + 1;
            }

            await UserProjectsModel.create(
                {
                    userId: userId, projectId: rProj.id, owner: true, order: order
                });

            await t?.commit();
            return this.get(userId, rProj.id);
        } catch (e) {
            await t?.rollback();
            throw e;
        }
    }

    async shareProject(userId: string, projId: number, sharedWithUsers: string[]): Promise<void> {
        const userProj = await this.get(userId, projId);

        if (!userProj) {
            throw new Error('Only project collaborators can share.');
        }

        for (const user of sharedWithUsers) {
            const order = await UserProjectsModel.max<number, UserProjectsModel>('order', { where: { userId: user } });
            await UserProjectsModel.create(
                {
                    userId: user,
                    projectId: projId,
                    owner: false,
                    order: (order || 0) + 1
                });
        }
    }

    async get(userId: string, projId: number): Promise<ProjectModel | null> {
        return ProjectModel.findOne({
            where: {
                id: projId
            },
            include: [{
                model: CommentModel,
                as: ProjectCommentAssociation.as
            },
            this.getCommonProjectInclude(userId)]
        });
    }
}

export default new ProjectRepository();