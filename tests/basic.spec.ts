import { test, expect, Cookie } from "@playwright/test";

test.describe("Before login", () => {
    test("未ログイン用のトップページが正常に表示される", async ({page}) => {
        await page.goto("/");
        // alt属性が"Next.js logo"の画像を特定
        const image = page.locator("img[alt=\"Next.js logo\"]");
        await expect(image).toBeVisible();
    });

    test("未ログインの場合ギャラリー画面から/loginに飛ばされる", async ({page}) => {
        await page.goto("/gallery/cm535zcj000008o6uzajkoerb");
        await page.waitForTimeout(2000);
        expect(await page.locator("#ariax-passkey-sign-in").count()).toBeGreaterThan(0);
    });
});

test.describe.serial("Authentications & API Calling", () => {
    let savedCookies: Cookie[] = [];

    test("パスキー（WebAuthn）でサインアップ => サインインできる", async ({ browserName, page }, testInfo) => {
        test.skip(browserName !== "chromium", "This test runs only in Chromium");
        await page.goto("/login");

        // Listen for all console logs
        page.on("console", msg => console.log(msg.text()));

        // Virtual Authenticatorを追加
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send("WebAuthn.enable");
        await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
            options: {
                protocol: "ctap2",
                ctap2Version: "ctap2_1",
                hasUserVerification: true,
                transport: "internal",
                automaticPresenceSimulation: true,
                isUserVerified: true,
                hasResidentKey: true,
            }
        });

        cdpSession.on("WebAuthn.credentialAdded", () => {
            console.log("Credential Added!");
        });

        // サインアップする
        await page.click("#ariax-sign-up");
        await page.waitForTimeout(2000);
        const beforeSignUpScreenshot = await page.screenshot();
        await testInfo.attach("Before sign-up", {
            body: beforeSignUpScreenshot,
            contentType: "image/png",
        });

        // やたら時間がかかることがある
        await page.waitForTimeout(8000);
        await page.reload();

        // サインインする
        await page.click("#ariax-passkey-sign-in");
        await page.waitForTimeout(500);
        const afterSignInScreenshot = await page.screenshot();
        await testInfo.attach("After click sign-in button", {
            body: afterSignInScreenshot,
            contentType: "image/png",
        });

        await page.waitForTimeout(5000);
        await page.goto("/");
        await page.waitForTimeout(5000);

        const appScreenshot = await page.screenshot();
        await testInfo.attach("After sign-in", {
            body: appScreenshot,
            contentType: "image/png",
        });

        // 成功していればギャラリーリストがあるはず
        expect(await page.locator("#ariax-gallery-list").count()).toBeGreaterThan(0);

        // Cookieを保存
        savedCookies = await page.context().cookies();

        // 最低でも1つ以上のCookieが保存されているはず
        expect(savedCookies.length).toBeGreaterThan(0);

        // 保存されたCookieのセキュリティ設定を確認
        for (const cookie of savedCookies) {
            expect(cookie.sameSite).toBe("Strict");
            expect(cookie.secure).toBe(true);
            expect(cookie.httpOnly).toBe(true);
        }
    });

    test("ギャラリーを作成できる", async ({ browserName, page }, testInfo) => {
        test.skip(browserName !== "chromium", "This test runs only in Chromium");

        await page.context().addInitScript(() => {
            // localStorage を設定します。
            window.localStorage.setItem("isLoggedIn", "true");
        });

        // サインイン済みの状態でテストを行う
        await page.context().addCookies(savedCookies);
        console.log(savedCookies);

        // Listen for all console logs
        page.on("console", msg => console.log(msg.text()));

        await page.goto("/");
        const homeScreenshot = await page.screenshot();
        await testInfo.attach("Before click #ariax-add-gallery", {
            body: homeScreenshot,
            contentType: "image/png",
        });

        await page.click("#ariax-add-gallery");
        await page.waitForTimeout(500);
        const addGalleryModalScreenshot = await page.screenshot();
        await testInfo.attach("After click #ariax-add-gallery", {
            body: addGalleryModalScreenshot,
            contentType: "image/png",
        });

        await page.fill("#new-gallery-name", "Test gallery");
        await page.click("#ariax-create-gallery-confirm");

        await page.waitForTimeout(4000);

        // ギャラリー名を持つspan要素があるはず
        expect(await page.locator("span").filter({ hasText: "Test gallery" }).count()).toBeGreaterThan(0);

        // 詳細ページに遷移
        await page.locator("span").filter({ hasText: "Test gallery" }).click();
        await page.waitForTimeout(4000);

        const galleryScreenshot = await page.screenshot();
        await testInfo.attach("After create gallery", {
            body: galleryScreenshot,
            contentType: "image/png",
        });

        // No images が表示されているはず
        expect(await page.locator("p").filter({ hasText: "No images" }).count()).toBeGreaterThan(0);
    });
});
