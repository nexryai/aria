import { Elysia, error, t } from "elysia";

import { S3Client } from "@aws-sdk/client-s3";

import { errorHandler } from "@/controllers/ErrorHandler";
import { galleryRepository, imageRepository, passkeyRepository, userRepository } from "@/prisma";
import { PasskeyAuthService } from "@/services/AuthService";
import { GalleryService } from "@/services/GalleryService";
import { UserService } from "@/services/UserService";
import { AwsStorageService } from "@/services/internal/StorageService";


// Nextのプロダクションビルドでコケる対策
const loadEnv = process.env.NEXT_PHASE !== "phase-production-build";
const s3Endpoint = loadEnv ? process.env.S3_ENDPOINT : "DUMMY";
const s3AccessKeyId = loadEnv ? process.env.S3_ACCESS_KEY_ID : "DUMMY";
const s3SecretAccessKey = loadEnv ? process.env.S3_SECRET_ACCESS_KEY : "DUMMY";
const s3Bucket = loadEnv ? process.env.S3_BUCKET : "DUMMY";

if (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket) {
    throw new Error("Invalid configuration");
}

const s3 = new S3Client({
    region: "auto",
    endpoint: s3Endpoint,
    credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey
    },
});

const storageService = new AwsStorageService(s3, s3Bucket);

const userService = new UserService(userRepository);
const passkeyAuthService = new PasskeyAuthService(passkeyRepository);
const galleryService = new GalleryService(galleryRepository, imageRepository, storageService);

export const authRouter = new Elysia({ prefix: "/auth", serve: { maxRequestBodySize: 1024 *  1024 * 4 }, aot: false })
    .use(errorHandler)
    .post("/register-request", async ({body, cookie: {challengeSession}}) => {
        if (process.env.NODE_ENV === "production" && process.env.ALLOW_REGISTRATION !== "1") {
            return new Response("Registration is disabled", {status: 403});
        }

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


export const apiRouter = new Elysia({ prefix: "/api", serve: { maxRequestBodySize: 1024 *  1024 * 4 }, aot: false })
    .use(errorHandler)
    .derive(({ cookie: {token} }) => {
        // Auth middleware
        if (!token || !token.value) {
            throw new Error("AuthError: token not found");
        }

        const user = passkeyAuthService.decryptToken(token.value, false);
        if (!user) {
            throw new Error("AuthError: token is invalid");
        }

        return {
            uid: user.uid,
        };
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

    .get("/gallery/:id", async ({ uid, params: { id }, query: { offset } }) => {
        return await galleryService.getGalleryById(id, uid, offset ?? 0);
    }, {
        params: t.Object({
            id: t.String()
        }),
        query: t.Object({
            offset: t.Optional(t.Number())
        })
    })

    .delete("/gallery/:id", async ({ uid, params: { id } }) => {
        return await galleryService.deleteGallery(uid, id);
    }, {
        params: t.Object({
            id: t.String()
        })
    })

    .post("/gallery/:id/upload", async ({ uid, params: { id }, body }) => {
        return await galleryService.getSignedUploadUrl(
            uid,
            id,
            body.sha256Hash,
            body.blurhash,
            body.width,
            body.height
        );
    }, {
        params: t.Object({
            id: t.String()
        }),
        body: t.Object({
            sha256Hash: t.String(),
            blurhash: t.String(),
            width: t.Number(),
            height: t.Number(),
        })
    })

    .get("/image/:key", async ({ uid, params: { key }, redirect }) => {
        const signedUrl = await galleryService.getSignedImageUrl(uid, key, false);
        if (!signedUrl) {
            return error(404);
        }

        return redirect(signedUrl, 302);
    }, {
        params: t.Object({
            key: t.String()
        })
    })

    .get("/thumbnail/:key", async ({ uid, params: { key }, redirect }) => {
        const signedUrl = await galleryService.getSignedImageUrl(uid, key, true);
        if (!signedUrl) {
            return error(404);
        }

        return redirect(signedUrl, 302);
    }, {
        params: t.Object({
            key: t.String()
        })
    });


export type IElysiaApp = typeof apiRouter;
