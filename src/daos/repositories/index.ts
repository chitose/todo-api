import { createCommentsRepository, ICommentsRepository } from './comment-repo';
import { createLabelRepository, ILabelRepository } from './label-repo';
import ProjectRepository, { IProjectRepository } from './project-repo';
import { createTaskRepository, ITaskRepository } from './task-repo';
import UserRepository, { IUserRepository } from './user-repo';

export function getUserRepository(): IUserRepository {
    return UserRepository;
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