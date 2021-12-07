/* eslint-disable quotes */
import { getUserRepository } from '@daos/repositories';
import express from 'express';
import jwt from 'jsonwebtoken';
import passport, { Profile } from 'passport';
import { OAuth2Strategy } from 'passport-google-oauth';

export function configureAuthentication(app: express.Express, appSecret: string) {
    /* PASSPORT SETUP */
    let userProfile: Profile & { jwt?: string };


    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/success', (req, res) => res.send({
        id: userProfile.id,
        displayName: userProfile.displayName,
        email: userProfile.emails && userProfile.emails[0].value,
        photo: userProfile.photos && userProfile.photos[0].value,
        jwt: userProfile.jwt
    }));

    app.get('/error', (req, res) => res.send("error logging in"));

    passport.serializeUser(function (user: Express.User, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function (obj: false | Express.User | null | undefined, cb) {
        cb(null, obj);
    });

    /* GOOGLE AUTH */
    // eslint-disable-next-line max-len
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;

    passport.use(new OAuth2Strategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/auth/google/callback'
    }, function (accessToken, refreshToken, profile, done) {
        userProfile = profile;
        return done(null, userProfile);
    }));

    app.get('/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] }));
    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/error' }),
        function (req, res) {
            // Successful authentication, redirect success.
            // generate the jwt token
            const userRepo = getUserRepository();
            userRepo.userExists(userProfile.id).then(userExists => {
                if (!userExists) {
                    userRepo.addUser(userProfile).then();
                }
            });
            userProfile.jwt = jwt.sign({
                id: userProfile.id
            }, appSecret, {
                expiresIn: 86400
            });
            res.redirect('/success');
        });

    /* VERIFY JWT TOKEN */
    app.use(function (req, res, next) {
        if (req.headers && req.headers.authorization) {
            jwt.verify(req.headers.authorization, appSecret,
                function (err, decode) {
                    const userRepo = getUserRepository();
                    if (err || !decode) {
                        req.user = undefined;
                        res.status(401)
                            .send({
                                message: 'Invalid authrorization token'
                            })
                    }
                    else {
                        const userId = (decode as unknown as { id: string }).id;

                        userRepo.getUser(userId).then(user => {
                            if (!user) {
                                res.status(401).send({
                                    message: 'Unauthorized user'
                                });
                            } else {
                                req.user = user;
                                next();
                            }
                        });
                    }
                });
        } else {
            res.status(401)
                .send({ message: 'Missing JWT authorization header' });
        }
    });
}