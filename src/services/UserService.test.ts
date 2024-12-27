import { PrismockClient } from "prismock";
import { describe, it, expect, afterAll } from "vitest";

import { UserService } from "./UserService";

describe("UserService test", async () => {
    const prismock = new PrismockClient();
    const userService = new UserService(prismock.user);

    afterAll(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prismock.reset();
    });

    it("正常にユーザーを作成できる", async () => {
        const dummyUserName = "Raiden Mei";
        const created = await userService.createUser({
            name: dummyUserName
        });
        const fetched = await userService.getUserById(created.id);
        expect(fetched?.name).toBe(dummyUserName);
    });

    it("正常にユーザーの有無を判別できる", async () => {
        const created = await userService.createUser({
            name: "Kiana Kaslana"
        });

        const exists = await userService.isExistUser(created.id);
        expect(exists).toBe(true);
    });

    it("正常にユーザー情報を更新できる", async () => {
        const dummyUserName = "Robin";
        const created = await userService.createUser({
            name: dummyUserName
        });

        const newUserName = "Workday";
        await userService.updateUser(created.id, {
            name: newUserName
        });

        const fetched = await userService.getUserById(created.id);
        expect(fetched?.name).toBe(newUserName);
    });
});
