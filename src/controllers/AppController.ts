import { Elysia, error, t } from "elysia";
import { UserService } from "@/services/UserService";
import { PasskeyAuthService } from "@/services/AuthService";
import { passkeyRepository, userRepository } from "@/prisma";

const userService = new UserService(userRepository);
const passkeyAuthService = new PasskeyAuthService(passkeyRepository);

export const authRouter = new Elysia({ prefix: '/auth' })
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
    })


export const apiRouter = new Elysia({ prefix: '/api' })
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
        } catch {
            return error(401, {
                message: "Unauthorized",
                uid: null,
            });
        }
    })
    .get('/gallery/:id', ({ params, uid }) => `Elysia: ${params.id} UID:${uid.toUpperCase()}`, {
        params: t.Object({
            id: t.String()
        })
    })
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })


export type IElysiaApp = typeof apiRouter;