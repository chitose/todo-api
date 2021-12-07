import { CommentModel, COMMENTS_TABLE, PROJECT_COMMENTS_TABLE, ProjectCommentsModel } from '@daos/models';
import { Op } from 'sequelize/dist';

export interface ICommentsRepository {
    /**
     * Add comment to project
     * @param projId
     * @param userId 
     * @param comments 
     */
    addProjectComment(projId: number, userId: string, comments: string): Promise<CommentModel[]>;

    /**
     * Remove comment and its association records
     * @param cmtId 
     */
    removeComment(cmtId: number): Promise<void>;
}

class CommentsRepository implements ICommentsRepository {
    async addProjectComment(projId: number, userId: string, comments: string): Promise<CommentModel[]> {
        const cmt = await CommentModel.create({
            userId: userId,
            comments: comments
        });

        await ProjectCommentsModel.create({
            commentId: cmt.id,
            projectId: projId
        });

        return CommentModel.sequelize?.query(`
        SELECT c.* from ${COMMENTS_TABLE} c left join ${PROJECT_COMMENTS_TABLE} pc on c.id = pc.commentId
        WHERE pc.projectId = :projId
        `, {
            model: CommentModel,
            mapToModel: true,
            replacements: {
                projId: projId
            }
        }) as Promise<CommentModel[]>;
    }

    async removeComment(cmtId: number): Promise<void> {
        await CommentModel.destroy({
            where: {
                id: {
                    [Op.eq]: cmtId
                }
            }
        });
    }
}

export default new CommentsRepository();