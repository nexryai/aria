import { startAuthentication } from "@simplewebauthn/browser";

export async function signIn(): Promise<void> {
    const response = await fetch("https://aria.nexryai.me/auth/login-request");
    const loginOptions = await response.json();

    let asseResp;
    try {
        // Pass the options to the authenticator and wait for a response
        asseResp = await startAuthentication({ optionsJSON: loginOptions });
    } catch (error) {
        // Some basic error handling
        console.log("Error during authentication: " + error);
        throw error;
    }

    const verificationResp = await fetch("https://aria.nexryai.me/auth/verify-login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(asseResp),
    });

    if (!verificationResp.ok) {
        throw new Error("Authentication failed");
    }

    localStorage.setItem("isLoggedIn", "true");
}

export async function isSignedIn(): Promise<boolean> {
    return localStorage.getItem("isLoggedIn") === "true";
}
