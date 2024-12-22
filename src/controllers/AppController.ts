import { Elysia, error, t } from "elysia";

import { errorHandler } from "@/controllers/ErrorHandler";
import { galleryRepository, passkeyRepository, userRepository } from "@/prisma";
import { PasskeyAuthService } from "@/services/AuthService";
import { GalleryService } from "@/services/GalleryService";
import { UserService } from "@/services/UserService";

const userService = new UserService(userRepository);
const passkeyAuthService = new PasskeyAuthService(passkeyRepository);
const galleryService = new GalleryService(galleryRepository);

export const authRouter = new Elysia({ prefix: "/auth" })
    .use(errorHandler)
    .post("/register-request", async ({body, cookie: {challengeSession}}) => {
        const user = await userService.createUser({name: body.displayName});
        const res = await passkeyAuthService.genRegisterChallenge(user.id, body.displayName);

        challengeSession.value = res.encryptedChallenge;
        challengeSession.httpOnly = true;
        challengeSession.secure = true;
        challengeSession.sameSite = "strict";
        challengeSession.expires = new Date(Date.now() + 60 * 1000);
        challengeSession.path = "/auth/verify-registration";

        return res.options;
    }, {
        body: t.Object({
            displayName: t.String({
                error: "displayName must be a string"
            })
        })
    })

    .post("/verify-registration", async ({body, cookie}) => {
        const encryptedChallenge = cookie.challengeSession.value;
        const ok = await passkeyAuthService.verifyRegistration(encryptedChallenge, body as unknown);
        if (!ok) {
            return new Response("Invalid challenge", {status: 400});
        }
    }, {
        cookie: t.Object({
            challengeSession: t.String({
                error: "challengeSession must be a string"
            })
        })
    })

    .get("/login-request", async ({cookie: {challengeSession}}) => {
        const res = await passkeyAuthService.genLoginChallenge();
        challengeSession.value = res.encryptedChallenge;
        challengeSession.httpOnly = true;
        challengeSession.secure = true;
        challengeSession.sameSite = "strict";
        challengeSession.expires = new Date(Date.now() + 60 * 1000);
        challengeSession.path = "/auth/verify-login";

        return res.options;
    })

    .post("/verify-login", async ({body, cookie: {challengeSession, token}}) => {
        const encryptedChallenge = challengeSession.value;
        const generatedToken = await passkeyAuthService.verifyLogin(encryptedChallenge, body as unknown);
        if (!token) {
            return new Response("Invalid challenge", {status: 400});
        }

        token.value = generatedToken;
        token.httpOnly = true;
        token.secure = true;
        token.sameSite = "strict";
        token.expires = new Date(Date.now() + 30 * 60 * 1000);
        token.path = "/api";

        return "OK";
    }, {
        cookie: t.Object({
            challengeSession: t.String({
                error: "challengeSession must be a string"
            }),
        })
    })

    .get("/logout", async ({cookie: {token}}) => {
        token.value = "";
        token.httpOnly = true;
        token.secure = true;
        token.sameSite = "strict";
        token.expires = new Date(0);
        token.path = "/api";

        return {
            loggedOut: true
        };
    });


export const apiRouter = new Elysia({ prefix: "/api" })
    .use(errorHandler)
    .derive(({ cookie: {token} }) => {
        // Auth middleware
        if (!token || !token.value) {
            return error(401, {
                message: "Unauthorized",
                uid: null,
            });
        }

        try {
            const user = passkeyAuthService.decryptToken(token.value, false);
            if (!user) {
                throw new Error("Invalid token");
            }

            return {
                uid: user.uid,
            };
        } catch(e) {
            console.error(e);
            return error(401, {
                message: "Unauthorized",
                uid: null,
            });
        }
    })

    .get("/gallery", async ({ uid }) => {
        return await galleryService.getGalleriesByUserId(uid);
    })

    .post("/gallery", async ({ body, uid }) => {
        return await galleryService.createGallery(uid, body.name);
    }, {
        body: t.Object({
            name: t.String()
        })
    })

    .post("/", ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    });


export type IElysiaApp = typeof apiRouter;
