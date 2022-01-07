import './loadEnv';

import { UserModel } from '@daos/models';
import { getLabelRepository, getUserRepository } from '@daos/repositories';
import db from '@daos/sqlite3/sqlite-dao';
import logger from '@shared/logger';
import commandLineArgs from 'command-line-args';
import find from 'find';
import Jasmine from 'jasmine';
import jwt from 'jsonwebtoken';

const appSecret = process.env.APP_SECRET as string;
type UserWithJwt = UserModel & { auth?: string };
let user1: UserWithJwt;
let user2: UserWithJwt;
let user3: UserWithJwt;

export async function prepareTestData() {
    const labelRepo = getLabelRepository();
    // generate test user
    const userRepo = getUserRepository();

    user1 = await userRepo.addUser({
        id: '1',
        displayName: 'Test User 1',
        provider: 'Test'
    });

    user2 = await userRepo.addUser({
        id: '2',
        displayName: 'Test User 2',
        provider: 'Test'
    });

    user3 = await userRepo.addUser({
        id: '3',
        displayName: 'Test User 3',
        provider: 'Test'
    });

    user1.auth = jwt.sign({
        id: user1.id
    }, appSecret);

    user2.auth = jwt.sign({
        id: user2.id
    }, appSecret);

    user3.auth = jwt.sign({
        id: user3.id
    }, appSecret);

    await labelRepo.createLabel(user1.id, { title: 'label 1' });
    await labelRepo.createLabel(user1.id, { title: 'label 2' });
    await labelRepo.createLabel(user1.id, { title: 'label 3' });
    await labelRepo.createLabel(user2.id, { title: 'label 1' });
    await labelRepo.createLabel(user2.id, { title: 'label 2' });
    await labelRepo.createLabel(user2.id, { title: 'label 3' });
    await labelRepo.createLabel(user3.id, { title: 'label 1' });
    await labelRepo.createLabel(user3.id, { title: 'label 2' });
    await labelRepo.createLabel(user3.id, { title: 'label 3' });
}

export { user1, user2, user3 }

// Setup command line options
const options = commandLineArgs([
    {
        name: 'testFile',
        alias: 'f',
        type: String,
    },
]);


// Init Jasmine
const jasmine = new Jasmine();

// Set location of test files
jasmine.loadConfig({
    random: true,
    spec_dir: 'spec',
    spec_files: [
        './tests/**/*.spec.ts',
    ],
    stopSpecOnExpectationFailure: false,
});

// On complete callback function
jasmine.onComplete((passed: boolean) => {
    if (passed) {
        logger.info('All tests have passed :)');
    } else {
        logger.err('At least one test has failed :(');
    }
    jasmine.exitCodeCompletion(passed);
});

logger.info('Prepare database...');
db.sync({ force: true }).then(async () => {
    await prepareTestData();
    // Run all or a single unit-test
    if (options.testFile) {
        const testFile = options.testFile as string;
        find.file(testFile + '.spec.ts', './spec', (files: string[]) => {
            if (files.length === 1) {
                jasmine.specFiles = [files[0]];
                jasmine.execute();
            } else {
                logger.err('Test file not found!');
            }
        });
    } else {
        jasmine.execute();
    }

});