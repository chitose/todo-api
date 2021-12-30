import {
    CommentModel,
    CommentProjectAssociation,
    CommentTaskAssociation,
    ProjectModel,
    ProjectUserAssociation,
    TaskModel,
    TaskProjectAssociation,
    UserModel,
} from '@daos/models';
import { Op } from 'sequelize';

import { IProjectRepository } from './project-repo';
import { ITaskRepository } from './task-repo';

export interface ICommentsRepository {
    search(userId: string, text: string): Promise<CommentModel[]>;

    addProjectComment(userId: string, projId: number, comments: string): Promise<CommentModel>;


    removeProjectComment(userId: string, projectId: number, cmtId: number): Promise<void>


    getProjectComments(userId: string, projectId: number): Promise<CommentModel[]>;


    addTaskComment(userId: string, projId: number, taskId: number, comments: string): Promise<CommentModel>;


    removeTaskComment(userId: string, taskId: number, cmtId: number): Promise<void>;


    getTaskComments(userId: string, projId: number, taskId: number): Promise<CommentModel[]>;
}

class CommentsRepository implements ICommentsRepository {
    constructor(private projectRepo: IProjectRepository, private taskRepo: ITaskRepository) {

    }

    async search(userId: string, text: string): Promise<CommentModel[]> {
        const projectComments = await CommentModel.findAll({
            where: {
                comments: { [Op.like]: `%${text}%` }
            },
            include: [
                {
                    model: ProjectModel,
                    required: true,
                    as: TaskProjectAssociation.as,
                    attributes: [],
                    include: [{
                        model: UserModel,
                        as: ProjectUserAssociation.as,
                        where: {
                            id: userId
                        },
                        attributes: []
                    }]
                }]
        });

        const taskComments = await CommentModel.findAll({
            where: {
                comments: { [Op.like]: `%${text}%` }
            },
            include: [
                {
                    model: TaskModel,
                    as: CommentTaskAssociation.as,
                    required: true,
                    attributes: [],
                    include: [{
                        model: ProjectModel,
                        as: TaskProjectAssociation.as,
                        attributes: [],
                        include: [{
                            model: UserModel,
                            as: ProjectUserAssociation.as,
                            where: {
                                id: userId
                            },
                            attributes: []
                        }]
                    }]
                }
            ]
        });

        return [...projectComments, ...taskComments];
    }

    async addTaskComment(userId: string, projId: number, taskId: number, comments: string): Promise<CommentModel> {
        const task = await this.taskRepo.getTask(userId, taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        return await CommentModel.create({
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

    async getTaskComments(userId: string, projectId: number, taskId: number): Promise<CommentModel[]> {
        return CommentModel.findAll({
            include: [{
                model: TaskModel,
                as: CommentTaskAssociation.as,
                required: true,
                where: {
                    id: taskId
                },
                attributes: [],
                include: [{
                    model: ProjectModel,
                    required: true,
                    as: TaskProjectAssociation.as,
                    attributes: [],
                    where: {
                        id: projectId
                    },
                    include: [
                        {
                            model: UserModel,
                            required: true,
                            as: ProjectUserAssociation.as,
                            where: {
                                id: userId
                            },
                            attributes: []
                        }
                    ]
                }]
            }]
        });
    }

    async getProjectComments(userId: string, projectId: number): Promise<CommentModel[]> {
        return CommentModel.findAll({
            include: [{
                model: ProjectModel,
                required: true,
                as: CommentProjectAssociation.as,
                where: {
                    id: projectId
                },
                attributes: [],
                include: [
                    {
                        model: UserModel,
                        required: true,
                        as: ProjectUserAssociation.as,
                        where: {
                            id: userId
                        },
                        attributes: []
                    }
                ]
            }]
        });
    }

    async addProjectComment(userId: string, projId: number, comments: string): Promise<CommentModel> {
        const p = await this.projectRepo.get(userId, projId);
        if (!p) {
            throw new Error('Project not found');
        }

        return CommentModel.create({
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