import { CommentModel, COMMENTS_TABLE, ICommentAttribute, IUserProjectsAttribute, USER_PROJECTS_TABLE } from '@daos/models';
import { getKey } from '@shared/utils';
import { Op, QueryTypes } from 'sequelize';

import { IProjectRepository } from './project-repo';
import { ITaskRepository } from './task-repo';

export interface ICommentsRepository {
    /**
     * Add comment to project.
     */
    addProjectComment(userId: string, projId: number, comments: string): Promise<CommentModel>;

    /**
     * Remove project comment
     */
    removeProjectComment(userId: string, projectId: number, cmtId: number): Promise<void>

    /**
     * Gets project comments
     */
    getProjectComments(userId: string, projectId: number): Promise<CommentModel[]>;

    /**
     * Add comment to task
     */
    addTaskComment(userId: string, projId: number, taskId: number, comments: string): Promise<CommentModel>;

    /**
     * Remove a comment from task.
     */
    removeTaskComment(userId: string, taskId: number, cmtId: number): Promise<void>;

    /**
     * Get task comments.
     */
    getTaskComments(userId: string, projId: number, taskId: number): Promise<CommentModel[]>;
}

class CommentsRepository implements ICommentsRepository {
    constructor(private projectRepo: IProjectRepository, private taskRepo: ITaskRepository) {

    }

    async addTaskComment(userId: string, projId: number, taskId: number, comments: string): Promise<CommentModel> {
        const task = await this.taskRepo.getTask(userId, taskId);
        if (task) {
            throw new Error('Task not found');
        }

        return await CommentModel.create({
            projectId: projId,
            taskId: taskId,
            commentDate: new Date(),
            comments: comments,
            userId: userId
        });
    }

    async removeTaskComment(userId: string, taskId: number, cmtId: number): Promise<void> {
        const task = await this.taskRepo.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        await CommentModel.destroy({
            where: {
                [Op.and]: {
                    id: {
                        [Op.eq]: cmtId
                    },
                    taskId: {
                        [Op.eq]: taskId
                    }
                }
            }
        });
    }

    async getTaskComments(userId: string, taskId: number): Promise<CommentModel[]> {
        return await CommentModel.sequelize?.query(`
        SELECT c.* from ${COMMENTS_TABLE} c left join ${USER_PROJECTS_TABLE} up
        ON c.${getKey<ICommentAttribute>('projectId')} = up.${getKey<IUserProjectsAttribute>('projectId')}
        AND up.${getKey<IUserProjectsAttribute>('userId')} = : userId
        WHERE c.${getKey<ICommentAttribute>('taskId')} = : taskId
        `,
            {
                type: QueryTypes.SELECT,
                model: CommentModel,
                mapToModel: true,
                replacements: {
                    taskId,
                    userId
                }
            }) as CommentModel[];
    }

    async getProjectComments(userId: string, projectId: number): Promise<CommentModel[]> {
        return await CommentModel.sequelize?.query(`
        SELECT c.* from ${COMMENTS_TABLE} left join ${USER_PROJECTS_TABLE} up
        ON c.${getKey<ICommentAttribute>('projectId')} = up.${getKey<IUserProjectsAttribute>('projectId')}
        AND up.${getKey<IUserProjectsAttribute>('userId')} = : userId
        WHERE c.${getKey<ICommentAttribute>('projectId')} = : projectId
    `, {
            model: CommentModel,
            mapToModel: true,
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                projectId
            }
        }) as CommentModel[];
    }

    async addProjectComment(userId: string, projId: number, comments: string): Promise<CommentModel> {
        const p = await this.projectRepo.get(userId, projId);
        if (!p) {
            throw new Error('Project not found');
        }

        return await CommentModel.create({
            userId: userId,
            projectId: projId,
            commentDate: new Date(),
            comments: comments
        });
    }

    async removeProjectComment(userId: string, projectId: number, cmtId: number): Promise<void> {
        const p = await this.projectRepo.get(userId, projectId);
        if (!p) {
            throw new Error('Project not found');
        }

        await CommentModel.destroy({
            where: {
                [Op.and]: {
                    id: {
                        [Op.eq]: cmtId
                    },
                    projectId: {
                        [Op.eq]: projectId
                    }
                }
            }
        });
    }
}

export function createCommentsRepository(projectRepo: IProjectRepository, taskRepo: ITaskRepository): ICommentsRepository {
    return new CommentsRepository(projectRepo, taskRepo);
}