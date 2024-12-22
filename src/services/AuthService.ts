import crypto from "crypto";

import {
    generateAuthenticationOptions,
    generateRegistrationOptions, verifyAuthenticationResponse,
    verifyRegistrationResponse
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
    AuthenticationResponseJSON, AuthenticatorTransportFuture
} from "@simplewebauthn/server";

import type { IPasskeyRepository } from "@/prisma";

enum TokenPermission {
    APP = "APP",
    CHALLENGE = "CHALLENGE",
}

interface TokenClaims {
    role: TokenPermission
    uid: string
    expireAt: Date
}

interface AppTokenClaims extends TokenClaims {
    role: TokenPermission.APP
}

interface ChallengeTokenClaims extends TokenClaims {
    role: TokenPermission.CHALLENGE
    challenge: string
}

/*
    DO NOT USE THIS FUNCTION IN PRODUCTION.
    NextJSのホットリロードが走るとシークレットがリセットされてAPIが呼び出せなくなる。
    これを防止するために、開発環境でのみ環境変数からシークレットを読み込むようにする。
    安全性が低いので、本番環境では絶対に使用しないこと。
 */
const unsafeLoadSecretFromEnv = (): Buffer => {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Loading secret from environment variables is only available in development mode.");
    }

    const secret = process.env["UNSAFE_SECRET_KEY_DO_NOT_USE_IN_PRODUCTION"];
    if (!secret) {
        throw new Error("Environment variable UNSAFE_SECRET_KEY_DO_NOT_USE_IN_PRODUCTION is not set.");
    }

    return Buffer.from(secret, "base64");
};

/*
    AuthService provides methods to generate and verify tokens for authentication and challenge.
    This class is designed to be stateless and does not depend on any external services.
    Tokens are encrypted with AES-256-GCM.
*/
class AuthService {
    private readonly secretKey = process.env.NODE_ENV === "development" ? unsafeLoadSecretFromEnv() : crypto.randomBytes(32);
    private readonly challengeSecretKey = crypto.randomBytes(32);

    private encrypt(data: string, key: Buffer): string {
        const iv = crypto.randomBytes(16); // CBCでは16バイトのIVが必要
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

        // 暗号化
        const encryptedData = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);

        // HMAC-SHA384で認証タグを生成
        const hmac = crypto.createHmac("sha384", key);
        hmac.update(iv); // IVもHMACに含める
        hmac.update(encryptedData);
        const authTag = hmac.digest();

        // 結果を結合してBase64エンコード
        return Buffer.concat([iv, encryptedData, authTag]).toString("base64");
    }

    private decrypt(encryptedData: string, key: Buffer): string {
        const dataBuffer = Buffer.from(encryptedData, "base64");

        // データの分割
        const iv = dataBuffer.subarray(0, 16); // 最初の16バイトはIV
        const authTag = dataBuffer.subarray(-48); // 最後の48バイトはHMAC-SHA384
        const encryptedText = dataBuffer.subarray(16, -48); // 残りが暗号化データ

        // HMACの検証
        const hmac = crypto.createHmac("sha384", key);
        hmac.update(iv);
        hmac.update(encryptedText);
        const calculatedAuthTag = hmac.digest();

        if (!crypto.timingSafeEqual(authTag, calculatedAuthTag)) {
            throw new Error("Authentication failed");
        }

        // 復号化
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        const decryptedData = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

        return decryptedData.toString("utf8");
    }

    /***
     generateAppToken generates an encrypted token for the user. This token is used for authentication.
     * @param uid unique identifier of the user
     * @param expireAt expiration date of the token
     * @returns encrypted token
     ***/
    protected generateAppToken(uid: string, expireAt: Date): string {
        const payload = JSON.stringify({
            role: TokenPermission.APP,
            uid,
            expireAt: expireAt.toISOString()
        });
        return this.encrypt(payload, this.secretKey);
    }

    /***
     generateAppToken generates an encrypted token for the user. This token is used for the challenge, such as WebAuthn.
     Don't use this token for authentication.
     * @param uid unique identifier of the user
     * @param challenge challenge string
     * @param expireAt expiration date of the token
     * @returns encrypted token
     ***/
    protected generateChallengeToken(uid: string, challenge: string, expireAt: Date): string {
        const payload = JSON.stringify({
            role: TokenPermission.CHALLENGE,
            uid,
            challenge,
            expireAt: expireAt.toISOString()
        });
        return this.encrypt(payload, this.challengeSecretKey);
    }

    /***
     decryptToken decrypts the encrypted token and returns the token claims.
     If the token is invalid or expired, it returns null.
     This method is used for authentication and stateless session management.
     * @param encryptedData encrypted token
     * @param isChallengeToken whether the token is a challenge token
     * @returns token data
     ***/
    public decryptToken(encryptedData: string, isChallengeToken: boolean): { uid: string, expireAt: Date, challenge?: string } | null {
        const decryptedData = this.decrypt(encryptedData, isChallengeToken ? this.challengeSecretKey : this.secretKey);
        const parsedData: TokenClaims = JSON.parse(decryptedData);

        // 有効期限の確認
        const expireAt = new Date(parsedData.expireAt);
        const now = new Date();

        if (expireAt <= now) {
            return null;
        }

        if (isChallengeToken) {
            const parsed = parsedData as ChallengeTokenClaims;
            if (!parsed || !parsed.challenge || parsed.role !== TokenPermission.CHALLENGE) {
                console.log("Invalid token.");
                return null;
            }

            return {
                uid: parsed.uid,
                challenge: parsed.challenge,
                expireAt
            };
        } else {
            const parsed = parsedData as AppTokenClaims;
            if (!parsed || parsed.role !== TokenPermission.APP) {
                console.log("Invalid token.");
                return null;
            }

            return {
                uid: parsed.uid,
                expireAt
            };
        }
    }
}

/*
    PasskeyAuthService provides methods to authenticate users with WebAuthn.
    This class depends on the PasskeyRepository to store the user's passkeys.
*/
export class PasskeyAuthService extends AuthService {
    private readonly rpName = "Aria";
    private readonly rpId = process.env.RP_ID || "localhost";
    private readonly origin = process.env.APP_URL || "http://localhost:3000";

    constructor(
        private readonly passkeyRepository: IPasskeyRepository
    ) {
        super();
    }

    public async genRegisterChallenge(uid: string, username: string): Promise<{ options: PublicKeyCredentialCreationOptionsJSON, encryptedChallenge: string }> {
        const options: PublicKeyCredentialCreationOptionsJSON = await generateRegistrationOptions({
            rpName: this.rpName,
            rpID: this.rpId,
            userID: Buffer.from(uid, "base64"),
            userName: username,
            // Don't prompt users for additional information about the authenticator
            attestationType: "none",
            // Prevent users from re-registering existing authenticators
            /*
            excludeCredentials: userPasskeys.map(passkey => ({
                id: passkey.id,
                // Optional
                transports: passkey.transports,
            })),
            */
            // See "Guiding use of authenticators via authenticatorSelection" below
            authenticatorSelection: {
                // Require the user to use a resident key
                residentKey: "required",
                requireResidentKey: true,
                userVerification: "preferred",
                authenticatorAttachment: "platform",
            },
        });

        const encryptedChallenge = this.generateChallengeToken(uid, options.challenge, new Date(Date.now() + 6000));
        return { options, encryptedChallenge };
    }

    public async verifyRegistration(encryptedChallenge: string, body: unknown, passkeyName?: string): Promise<boolean> {
        const tokenData = this.decryptToken(encryptedChallenge, true);
        if (!tokenData) {
            return false;
        }

        if (!tokenData.challenge) {
            throw new Error("Challenge not found in decrypted token. THIS IS A BUG OR LEAK OF SERVER SECRET KEY.");
        }



        const { verified, registrationInfo } = await verifyRegistrationResponse({
            response: body as RegistrationResponseJSON,
            expectedChallenge: tokenData.challenge,
            expectedOrigin: this.origin,
            expectedRPID: this.rpId,
            requireUserVerification: false,
        });

        if (!verified || !registrationInfo) {
            throw new Error("Verification failed.");
        }

        const credential = registrationInfo.credential;
        const publicKey = isoBase64URL.fromBuffer(credential.publicKey);

        await this.passkeyRepository.create({
            data: {
                passkeyUserId: credential.id,
                name: passkeyName || "Passkey",
                publicKey: publicKey,
                user: {
                    connect: {
                        id: tokenData.uid
                    }
                },
                transports: credential.transports?.join(",") || "",
            }
        });

        return true;
    }

    public async genLoginChallenge(): Promise<{options:  PublicKeyCredentialRequestOptionsJSON, encryptedChallenge: string}> {
        const options = await generateAuthenticationOptions({
            rpID: this.rpId,
            allowCredentials: [],
        });

        const encryptedChallenge = this.generateChallengeToken("_LOGIN_CHALLENGE", options.challenge, new Date(Date.now() + 6000));
        return { options, encryptedChallenge };
    }

    public async verifyLogin(encryptedChallenge: string, body: unknown): Promise<string> {
        const tokenData = this.decryptToken(encryptedChallenge, true);
        if (!tokenData) {
            throw new Error("Invalid token.");
        }

        if (!tokenData.challenge) {
            throw new Error("Challenge not found in decrypted token. THIS IS A BUG OR LEAK OF SERVER SECRET KEY.");
        }

        const authRequest = body as AuthenticationResponseJSON;
        const passkeyId = authRequest.id;
        if (!passkeyId) {
            throw new Error("Passkey ID not found in the response.");
        }

        const cred = await this.passkeyRepository.findUniqueOrThrow({
            where: {
                passkeyUserId: passkeyId
            }
        });

        const { verified } = await verifyAuthenticationResponse({
            response: body as AuthenticationResponseJSON,
            expectedChallenge: tokenData.challenge,
            expectedOrigin: this.origin,
            expectedRPID: this.rpId,
            credential: {
                id: cred.id,
                publicKey: isoBase64URL.toBuffer(cred.publicKey),
                transports: cred.transports.split(",") as AuthenticatorTransportFuture[],
                counter: cred.counter,
            },
            requireUserVerification: false,
        });

        if (!verified) {
            throw new Error("Verification failed.");
        } else {
            // Update the counter
            // iCloudキーチェーンがカウンター非対応でエラーになるのでコメントアウト
            // https://stackoverflow.com/questions/78776653/passkey-counter-always-0-macos
            /*
            await this.passkeyRepository.update({
                where: {
                    passkeyUserId: passkeyId
                },
                data: {
                    counter: cred.counter + 1
                }
            })
            */
        }

        return this.generateAppToken(cred.userId, new Date(Date.now() + 30 * 60 * 1000));
    }
}

/*
    !! ⚠️DO NOT USE THIS CLASS IN ANY CODE EXCEPT FOR TESTS☠️ !!
    UnsafeDebugAuthService provides methods for integration and unit tests.
    This class is only used for:
        - Unit tests of AuthService
        - Generating tokens for integration tests
*/
export class UnsafeDebugAuthService extends AuthService {
    constructor() {
        if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
            throw new Error("UnsafeDebugAuthService is only available in development mode.");
        }

        super();
    }

    public genAppToken(uid: string, expireAt?: Date): string {
        return this.generateAppToken(uid, expireAt || new Date(Date.now() + 30 * 60 * 1000));
    }

    public genChallengeToken(uid: string, challenge: string, expireAt?: Date): string {
        return this.generateChallengeToken(uid, challenge, expireAt || new Date(Date.now() + 6000));
    }

    public decryptAppToken(encryptedData: string): { uid: string, expireAt: Date } | null {
        return this.decryptToken(encryptedData, false);
    }

    public decryptChallengeToken(encryptedData: string): { uid: string, expireAt: Date, challenge?: string } | null {
        return this.decryptToken(encryptedData, true);
    }
}
