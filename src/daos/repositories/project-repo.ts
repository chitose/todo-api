import { IProjectCreationAttributes, IUserAttribute, ProjectModel, UserProjectsModel } from '@daos/models';
import { Op } from 'sequelize';

export interface IProjectRepository {
    /**
     * Creates new project
     * @param proj
     * @param user 
     */
    createProject(proj: IProjectCreationAttributes, user: IUserAttribute): Promise<ProjectModel>;

    /**
     * Shares a project with other users
     * @param projId 
     * @param userIds 
     */
    shareProject(projId: number, userIds: string[]): Promise<void>;

    /**
     * Gets project by id
     * @param projId
     */
    get(projId: number): Promise<ProjectModel | null>;    

    /**
     * Gets all projects where userId is a collaborator
     * @param userId 
     */
    getUserProjects(userId: string): Promise<ProjectModel[]>;
}

class ProjectRepository implements IProjectRepository {
    async getUserProjects(userId: string): Promise<ProjectModel[]> {
        return await ProjectModel.sequelize?.query(`
            SELECT p.*
            FROM projects p left join user_projects up on p.id = up.projectId
            where up.userId = :userId
        `, {
            model: ProjectModel,
            mapToModel: true,
            replacements: {
                userId: userId
            }
        }) as ProjectModel[];
    }

    async createProject(proj: IProjectCreationAttributes,
        user: IUserAttribute): Promise<ProjectModel> {
        const rProj = await ProjectModel.create(proj);
        await UserProjectsModel.create(
            {
                userId: user.id, projectId: rProj.id
            });
        return await this.get(rProj.id) as ProjectModel;
    }

    async shareProject(projId: number, userIds: string[]): Promise<void> {
        await UserProjectsModel.bulkCreate(
            userIds.map(id => ({
                userId: id,
                projectId: projId
            }))
        );
    }

    async get(projId: number): Promise<ProjectModel | null> {
        return await ProjectModel.findOne({
            where: {
                id: {
                    [Op.eq]: projId
                }
            }
        })
    }
}

export default new ProjectRepository();