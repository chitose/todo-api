import express from 'express';
import expressJSDocSwagger, { Options } from 'express-jsdoc-swagger';

export default function setupSwagger(app: express.Express, testUserToken: string) {
    const options: Options = {
        info: {
            version: '1.0.0',
            title: 'Todo API',
            description: 'Documentation for Todo API',
            license: {
                name: 'MIT'
            },
        },
        security: {
            jwt: {
                type: 'http',
                scheme: 'bearer'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local DEV'
            }
        ],
        filesPattern: '../../**/*.ts',
        baseDir: __dirname,
        swaggerUIPath: '/api-docs',
        exposeSwaggerUI: true,
        exposeApiDocs: false,
        swaggerUiOptions: {
            swaggerOptions: {
                authAction: {
                    jwt: {
                        name: 'jwt',
                        schema: {
                            type: 'apiKey',
                            name: 'Authorization',
                            in: 'header'
                        },
                        value: testUserToken
                    }
                }
            }
        }
    };
    expressJSDocSwagger(app)(options);
}