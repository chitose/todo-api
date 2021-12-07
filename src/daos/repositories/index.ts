import ProjectRepository, { IProjectRepository } from './project-repo';
import UserRepository, { IUserRepository } from './user-repo';

export function getUserRepository(): IUserRepository {
    return UserRepository;
}

export function getProjectRepository(): IProjectRepository {
    return ProjectRepository;
}