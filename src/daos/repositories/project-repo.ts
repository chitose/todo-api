import {
    IProjectAttribute,
    IProjectCreationAttributes,
    IUserProjectsAttribute,
    ProjectModel,
    PROJECTS_TABLE,
    USER_PROJECTS_TABLE,
    UserProjectsModel,
} from '@daos/models';
import { getKey } from '@shared/utils';
import { QueryTypes } from 'sequelize';

export interface IProjectRepository {
    /**
     * Creates new project     
     */
    createProject(userId: string, proj: IProjectCreationAttributes): Promise<ProjectModel>;

    /**
     * Shares project with others.
     */
    shareProject(userId: string, projId: number, sharedWithUsers: string[]): Promise<void>;

    /**
     * Gets project by id
     */
    get(userId: string, projId: number): Promise<ProjectModel | null>;

    /**
     * Gets all projects where userId is a collaborator
     */
    getUserProjects(userId: string): Promise<ProjectModel[]>;

    /**
     * Delete project
     * @param userId 
     * @param projId 
     */
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
        return await ProjectModel.sequelize?.query(`
            SELECT p.*
            FROM ${PROJECTS_TABLE} p LEFT JOIN ${USER_PROJECTS_TABLE} up
            ON p.${getKey<IProjectAttribute>('id')} = up.${getKey<IUserProjectsAttribute>('projectId')}
            WHERE up.${getKey<IUserProjectsAttribute>('userId')} = :userId
        `, {
            model: ProjectModel,
            mapToModel: true,
            replacements: {
                userId: userId
            }
        }) as ProjectModel[];
    }

    async createProject(userId: string, proj: IProjectCreationAttributes): Promise<ProjectModel> {
        const rProj = await ProjectModel.create(proj);
        await UserProjectsModel.create(
            {
                userId: userId, projectId: rProj.id
            });
        return await this.get(userId, rProj.id) as ProjectModel;
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
        const proj = await ProjectModel.sequelize?.query(`
        SELECT p.* 
        FROM ${PROJECTS_TABLE} p
        LEFT JOIN ${USER_PROJECTS_TABLE} up on p.${getKey<IProjectAttribute>('id')} = up.${getKey<IUserProjectsAttribute>('projectId')}
        WHERE up.${getKey<IUserProjectsAttribute>('userId')} = :userId
        AND up.${getKey<IUserProjectsAttribute>('projectId')} = :projectId
        `, {
            model: ProjectModel,
            mapToModel: true,
            type: QueryTypes.SELECT,
            replacements: {
                userId: userId,
                projectId: projId
            }
        }) as ProjectModel[];

        return proj[0];
    }
}

export default new ProjectRepository();