/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    IProjectAttribute,
    IProjectCreationAttributes,
    ITaskAttribute,
    ITaskCreationAttributes,
    ViewType,
} from '@daos/models';
import { ISectionAttribute, ISectionCreationAttribute, SectionModel } from '@daos/models/section';
import app from '@server';
import { pErr } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import { user1, user2 } from 'spec';
import { ProjectRouteUrlBuilder } from 'src/routes/projects';
import supertest, { SuperTest, Test } from 'supertest';

const projectRouteBuilder = new ProjectRouteUrlBuilder(false);
describe('ProjectRouter - Sections', () => {
    let agent: SuperTest<Test>;

    beforeAll((done) => {
        agent = supertest.agent(app);
        done();
    });

    const callCreateProjectApi = (auth: string, reqBody: IProjectCreationAttributes) => {
        return agent.put(projectRouteBuilder.create())
            .set('Authorization', auth)
            .type('json').send(reqBody);
    }

    const callAddSectionApi = (auth: string, projectId: number, name: string) => {
        return agent.put(projectRouteBuilder.createSection(projectId))
            .set('Authorization', auth)
            .type('json').send({ name: name } as ISectionCreationAttribute);
    }

    const callUpdateSectionApi = (auth: string, projectId: number, sect: number, prop: Partial<ISectionCreationAttribute>) => {
        return agent.post(projectRouteBuilder.updateSection(projectId, sect))
            .set('Authorization', auth)
            .type('json').send(prop);
    }

    const callDeleteSectionApi = (auth: string, projectId: number, sect: number) => {
        return agent.delete(projectRouteBuilder.deleteSection(projectId, sect))
            .set('Authorization', auth);
    }

    const callSwapSectionOrderApi = (auth: string, projectId: number, sourceSectId: number, targetSectId: number) => {
        return agent.post(projectRouteBuilder.swapSectionOrder(projectId, sourceSectId, targetSectId))
            .set('Authorization', auth)
            .send();
    }

    const callGetSectionApi = (auth: string, projectId: number, sectId: number) => {
        return agent.get(projectRouteBuilder.getSection(projectId, sectId))
            .set('Authorization', auth);
    }

    const callGetSectionsApi = (auth: string, projectId: number) => {
        return agent.get(projectRouteBuilder.getSections(projectId))
            .set('Authorization', auth);
    }

    const callAddSectionTaskApi = (auth: string, projectId: number, sectId: number, taskProp: ITaskCreationAttributes) => {
        return agent.put(projectRouteBuilder.createSectionTask(projectId, sectId))
            .set('Authorization', auth)
            .type('json').send(taskProp);
    }

    const callDuplicateSectionApi = (auth: string, projectId: number, sectId: number) => {
        return agent.post(projectRouteBuilder.duplicateSection(projectId, sectId))
            .set('Authorization', auth).send();
    };

    describe(`"PUT:${projectRouteBuilder.createSection()}"`, () => {
        let project: IProjectAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                done();
            });
        });

        it(`should return status code ${StatusCodes.CREATED} when section is added succesfully.`, (done) => {
            callAddSectionApi(user1.auth!, project.id, 'Test section')
                .end((err1, res1) => {
                    pErr(err1);
                    expect(res1.status).toBe(StatusCodes.CREATED);
                    const sect = res1.body as ISectionAttribute;
                    expect(sect.id).toBeGreaterThan(0);
                    expect(sect.order).toBe(1);
                    done();
                });
        });

        it(`should return status code ${StatusCodes.BAD_REQUEST} when section is added by none project collaborator`, (done) => {
            callAddSectionApi(user2.auth!, project.id, 'Test section')
                .end((err, res) => {
                    pErr(err);
                    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
                    done();
                });
        });
    });

    describe(`"POST:$${projectRouteBuilder.updateSection()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it(`should return status code ${StatusCodes.OK} when section is updated succesfully.`, (done) => {
            callUpdateSectionApi(user1.auth!, project.id, section.id, { name: 'Name updated', order: 2 })
                .end((err, res) => {
                    pErr(err);
                    expect(res.status).toBe(StatusCodes.OK);
                    const usect = res.body as ISectionAttribute;
                    expect(usect.name).toBe('Name updated');
                    expect(usect.order).toBe(2);
                    done();
                });
        });

        it(`should return status code ${StatusCodes.BAD_REQUEST} when section is updated by non-collaborator.`, (done) => {
            callUpdateSectionApi(user2.auth!, project.id, section.id, { name: 'Name updated', order: 2 })
                .end((err, res) => {
                    pErr(err);
                    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
                    done();
                });
        });
    });

    describe(`"GET:${projectRouteBuilder.getSection()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it('should return the section by id when get section of a project where user is the collaborator.', done => {
            callGetSectionApi(user1.auth!, project.id, section.id).end((err, res) => {
                const s = res.body as ISectionAttribute;
                expect(res.status).toBe(StatusCodes.OK);
                expect(s.id).toBe(section.id);
                done();
            });
        });

        it('should return null when retrieve section of project where user is not the collaborator.', done => {
            callGetSectionApi(user2.auth!, project.id, section.id).end((err, res) => {
                expect(res.body).toBe('');
                done();
            });
        });
    });

    describe(`"GET:${projectRouteBuilder.getSections()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it('should return the sections of the project where user is the collaborator.', done => {
            callGetSectionsApi(user1.auth!, project.id).end((err, res) => {
                expect(res.status).toBe(StatusCodes.OK);
                const sections = res.body as ISectionAttribute[];
                expect(sections.length).toBe(1);
                expect(sections[0].id).toBe(section.id);
                done();
            });
        });

        it('should return [] when retrieve sections of project where user is not the collaborator.', done => {
            callGetSectionsApi(user2.auth!, project.id).end((err, res) => {
                const sections = res.body as ISectionAttribute[];
                expect(sections.length).toBe(0);
                done();
            });
        });
    });

    describe(`"DELETE:${projectRouteBuilder.deleteSection()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it(`should return status code ${StatusCodes.NO_CONTENT} when section is deleted successfully.`, done => {
            callDeleteSectionApi(user1.auth!, project.id, section.id).end((err, res) => {
                expect(res.status).toBe(StatusCodes.NO_CONTENT);
                done();
            });
        });

        it(`should return status code ${StatusCodes.BAD_REQUEST} when section is deleted by none-collaborator.`, done => {
            callDeleteSectionApi(user2.auth!, project.id, section.id).end((err, res) => {
                expect(res.status).toBe(StatusCodes.BAD_REQUEST);
                done();
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.swapSectionOrder()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it(`it should return status ${StatusCodes.OK} when section order are swapped`, done => {
            callAddSectionApi(user1.auth!, project.id, 'Test section 1').end((err, res) => {
                const targetSection = res.body as ISectionAttribute;
                callSwapSectionOrderApi(user1.auth!, project.id, section.id, targetSection.id).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.OK);
                    const sections = res1.body as ISectionAttribute[];
                    const usect = sections.find(s => s.id === section.id);
                    const utSect = sections.find(s => s.id === targetSection.id);
                    expect(usect?.order).toBe(targetSection.order);
                    expect(utSect?.order).toBe(section.order);
                    done();
                });
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.swapSectionOrder()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it(`it should return status ${StatusCodes.OK} when section order are swapped`, done => {
            callAddSectionApi(user1.auth!, project.id, 'Test section 1').end((err, res) => {
                const targetSection = res.body as ISectionAttribute;
                callSwapSectionOrderApi(user1.auth!, project.id, section.id, targetSection.id).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.OK);
                    const sections = res1.body as ISectionAttribute[];
                    const usect = sections.find(s => s.id === section.id);
                    const utSect = sections.find(s => s.id === targetSection.id);
                    expect(usect?.order).toBe(targetSection.order);
                    expect(utSect?.order).toBe(section.order);
                    done();
                });
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.duplicateSection()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    callAddSectionTaskApi(user1.auth!, project.id, section.id, {
                        title: 'Task 1',
                        description: 'Task 1 description',
                        projectId: project.id,
                        sectionId: section.id,
                        completed: false
                    }).end((err2, res2) => {
                        callAddSectionTaskApi(user1.auth!, project.id, section.id, {
                            title: 'Task 1 child',
                            description: 'Task 1 child description',
                            projectId: project.id,
                            sectionId: section.id,
                            parentTaskId: (res2.body as ITaskAttribute).id,
                            completed: false
                        }).end(() => {
                            done();
                        });
                    });
                });
            });
        });

        it(`should return status ${StatusCodes.CREATED} when section is duplicated successfully.`, done => {
            callDuplicateSectionApi(user1.auth!, project.id, section.id).end((err, res) => {
                expect(res.status).toBe(StatusCodes.CREATED);
                const section = res.body as SectionModel;
                expect(section.tasks).toBeDefined();
                expect(section.tasks?.length).toBe(2);
                const cTask = section.tasks?.find(t => t.parentTaskId);
                const pTask = section.tasks?.find(t => !t.parentTaskId);
                expect(cTask).toBeDefined();
                expect(pTask).toBeDefined();
                expect(cTask?.parentTaskId).toBe(pTask?.id);
                done();
            });
        });
    });
});