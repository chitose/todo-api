import {
    CommentModel,
    IProjectCreationAttributes,
    IUserAttribute,
    IUserProjectsAttribute,
    ProjectCommentAssociation,
    ProjectModel,
    ProjectUserAssociation,
    UserModel,
    UserProjectsModel,
} from '@daos/models';
import { getKey } from '@shared/utils';
import { Op } from 'sequelize';

export interface IProjectRepository {
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
}

class ProjectRepository implements IProjectRepository {
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
            const rProj = await ProjectModel.create(proj);

            const order = await UserProjectsModel.max<number, UserProjectsModel>('order', {
                where: {
                    userId: userId
                }
            });

            await UserProjectsModel.create(
                {
                    userId: userId, projectId: rProj.id, owner: true, order: (order || 0) + 1
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