import { createCommentsRepository, ICommentsRepository } from './comment-repo';
import { createLabelRepository, ILabelRepository } from './label-repo';
import ProjectRepository, { IProjectRepository } from './project-repo';
import createSearchRepository, { ISearchRepository } from './search-repo';
import { createSectionRepository, ISectionRepository } from './section-repo';
import { createTaskRepository, ITaskRepository } from './task-repo';
import { createUserRepository, IUserRepository } from './user-repo';

export function getUserRepository(): IUserRepository {
    return createUserRepository(getProjectRepository());
}

export function getProjectRepository(): IProjectRepository {
    return ProjectRepository;
}

export function getCommentRepository(): ICommentsRepository {
    return createCommentsRepository(getProjectRepository(), getTaskRepository());
}

export function getTaskRepository(): ITaskRepository {
    return createTaskRepository(getProjectRepository());
}

export function getLabelRepository(): ILabelRepository {
    return createLabelRepository(getTaskRepository());
}

export function getSectionRepository(): ISectionRepository {
    return createSectionRepository(getProjectRepository(), getTaskRepository());
}

export function getSearchRepository(): ISearchRepository {
    return createSearchRepository(getProjectRepository(), getTaskRepository(), getCommentRepository());
}