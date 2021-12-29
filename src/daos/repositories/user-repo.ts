import { UserModel, ViewType } from '@daos/models';
import { Profile } from 'passport';
import { Op } from 'sequelize';

import { IProjectRepository } from './project-repo';

export interface IUserRepository {
    /**
     * Gets user by userId
     * @param userId
     */
    getUser(userId: string): Promise<UserModel | null>;
    /**
     * Adds a new user
     * @param userProfile
     */
    addUser(userProfile: Profile): Promise<UserModel>;
    /**
     * Check user existance by userId
     * @param userId
     */
    userExists(userId: string): Promise<boolean>;
    /**
     * Gets all users
     */
    getAll(): Promise<UserModel[]>;
    /**
     * Gets all users with displayName or email containing the text
     * @param text
     */
    search(text: string): Promise<UserModel[]>;
}

class UserRepository implements IUserRepository {
    constructor(private projectRepo: IProjectRepository) { }

    getAll(): Promise<UserModel[]> {
        return UserModel.findAll();
    }

    search(text: string): Promise<UserModel[]> {
        return UserModel.findAll({
            where: {
                [Op.or]: {
                    displayName: {
                        [Op.substring]: text
                    },
                    email: {
                        [Op.substring]: text
                    }
                }
            }
        });
    }

    getUser(userId: string): Promise<UserModel | null> {
        return UserModel.findOne({
            where: {
                id: {
                    [Op.eq]: userId
                }
            }
        })
    }
    async addUser(userProfile: Profile): Promise<UserModel> {
        const user = await UserModel.create({
            id: userProfile.id,
            displayName: userProfile.displayName,
            photo: userProfile.photos ? userProfile.photos[0].value : null,
            email: userProfile.emails ? userProfile.emails[0].value : null
        });

        // create a default inbox project
        await this.projectRepo.createProject(user.id, {
            name: 'Inbox',
            view: ViewType.List,
            archived: false,
            defaultInbox: true
        });
        return user;
    }

    userExists(userId: string): Promise<boolean> {
        return this.getUser(userId).then(user => user != null);
    }
}

export function createUserRepository(projectRepo: IProjectRepository) {
    return new UserRepository(projectRepo);
};