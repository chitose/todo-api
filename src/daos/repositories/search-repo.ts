import { ICommentAttribute, IProjectAttribute, ITaskAttribute } from '..';
import { ICommentsRepository } from './comment-repo';
import { IProjectRepository } from './project-repo';
import { ITaskRepository } from './task-repo';

export interface ISearchRepository {
    search(userId: string, text: string): Promise<ISearchResult[]>;
}

/**
 * Search result
 * @typedef {object} SearchResult
 * @property {Project} project - Matched project info
 * @property {Comment} comment: Matched comment info
 * @property {Task} task: Matched task info
 *
 * @interface ISearchResult
 */
export interface ISearchResult {
    project?: IProjectAttribute;
    comment?: ICommentAttribute;
    task?: ITaskAttribute;
}

class SearchRepository implements ISearchRepository {
    constructor(private projectRepo: IProjectRepository, private taskRepo: ITaskRepository, private commentRepo: ICommentsRepository) {

    }

    async search(userId: string, text: string): Promise<ISearchResult[]> {
        const projects = await this.projectRepo.search(userId, text);
        const tasks = await this.taskRepo.search(userId, text);
        const comments = await this.commentRepo.search(userId, text);
        return [...projects.map(p => ({ project: p } as ISearchResult)), ...tasks.map(t => ({ task: t })), ...comments.map(c => ({ comment: c }))];
    }
}

export default function createSearchRepository(projectRepo: IProjectRepository, taskRepo: ITaskRepository, commentRepo: ICommentsRepository): ISearchRepository {
    return new SearchRepository(projectRepo, taskRepo, commentRepo);
}