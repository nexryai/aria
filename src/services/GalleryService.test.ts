import { PrismockClient } from "prismock";
import { describe, it, expect, afterEach } from "vitest";

import { type StorageService } from "@/services/internal/StorageService";

import { GalleryService } from "./GalleryService";


class DummyStorageService implements StorageService {
    public async getSignedUrlGET(key: string, expiresIn: number): Promise<string> {
        return `https://example.com/${key}?expiresIn=${expiresIn}`;
    }

    public async getSingedUrlPUT(key: string, expiresIn: number): Promise<string> {
        return `https://example.com/${key}?expiresIn=${expiresIn}`;
    }
}

describe("GalleryService test", async () => {
    const prismock = new PrismockClient();

    const galleryService = new GalleryService(
        prismock.gallery,
        prismock.image,
        new DummyStorageService(),
    );

    const createUser = async (name: string): Promise<string> => {
        const user = await prismock.user.create({
            data: {
                name: name,
            }
        });

        return user.id;
    };

    afterEach(async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await prismock.reset();
    });

    it("ギャラリーを作成して取得できる", async () => {
        const uid = await createUser("test");

        const created = await galleryService.createGallery(uid, "test");
        expect(created.id).not.toBeNull();
        expect(created.name).toEqual("test");
        expect(created.userId).toEqual(uid);
    });

    it("自分のギャラリーを取得できる", async () => {
        const uid = await createUser("test");

        const created = await galleryService.createGallery(uid, "test");
        const galleries = await galleryService.getGalleriesByUserId(uid);

        expect(galleries[0].id).toEqual(created.id);
        expect(galleries[0].name).toEqual(created.name);
        expect(galleries[0].userId).toEqual(uid);
        expect(galleries[0].images).toBeNull();
        expect(galleries[0].updatedAt).toBeNull();
        expect(typeof galleries[0].thumbnail).toEqual("string");
    });

    it("getGalleriesByUserIdの引数にundefinedが指定されても他人のギャラリーは表示されない", async () => {
        const uid = await createUser("test");
        await galleryService.createGallery(uid, "test");

        await expect((async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await galleryService.getGalleriesByUserId(undefined);
        })()).rejects.toThrowError("Integrity check failed: may be caused by bug(s) or leak of credentials");
    });

    it("他人のギャラリーのIDを指定しても取得できない", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");

        const uid2 = await createUser("Bad User");
        await galleryService.createGallery(uid2, "test");

        expect(await galleryService.getGalleryById(gallery.id, uid2, 0)).toBeNull();
    });

    it("getGalleryByIdの引数にundefinedが指定されても他人のギャラリーは取得できない", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");

        const uid2 = await createUser("Bad User");
        await galleryService.createGallery(uid2, "test");

        await expect((async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await galleryService.getGalleryById(gallery.id, undefined, 0);
        })()).rejects.toThrowError("Integrity check failed: may be caused by bug(s) or leak of credentials");
    });
});
