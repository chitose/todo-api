import {
    IProjectCreationAttributes,
    ProjectModel,
    ProjectUserAssociation,
    UserModel,
    UserProjectsModel,
} from '@daos/models';

export interface IProjectRepository {
    createProject(userId: string, proj: IProjectCreationAttributes): Promise<ProjectModel | null>;

    shareProject(userId: string, projId: number, sharedWithUsers: string[]): Promise<void>;

    get(userId: string, projId: number): Promise<ProjectModel | null>;

    getUserProjects(userId: string): Promise<ProjectModel[]>;

    deleteProject(userId: string, projId: number): Promise<void>;
}

class ProjectRepository implements IProjectRepository {
    async deleteProject(userId: string, projId: number): Promise<void> {
        const proj = await this.get(userId, projId);
        if (!proj) {
            throw new Error('Project not found');
        }

        await ProjectModel.destroy({
            where: {
                id: projId
            }
        });
    }

    async getUserProjects(userId: string): Promise<ProjectModel[]> {
        return ProjectModel.findAll({
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

    async createProject(userId: string, proj: IProjectCreationAttributes): Promise<ProjectModel | null> {
        const t = await ProjectModel.sequelize?.transaction();
        try {
            const rProj = await ProjectModel.create(proj);

            await UserProjectsModel.create(
                {
                    userId: userId, projectId: rProj.id
                });
            await t?.commit();
            return rProj;
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

        await UserProjectsModel.bulkCreate(
            sharedWithUsers.map(id => ({
                userId: id,
                projectId: projId
            }))
        );
    }

    async get(userId: string, projId: number): Promise<ProjectModel | null> {
        return ProjectModel.findOne({
            where: {
                id: projId
            },
            include: {
                model: UserModel,
                required: true,
                where: {
                    id: userId
                },
                as: ProjectUserAssociation.as,
                attributes: [],
                through: { attributes: [] }
            }
        });
    }
}

export default new ProjectRepository();