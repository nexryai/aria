import { PrismockClient } from "prismock";
import { describe, it, expect, afterEach } from "vitest";

import { type IStorageService } from "@/services/internal/StorageService";

import { GalleryService } from "./GalleryService";


class DummyStorageService implements IStorageService {
    public async getSignedUrlGET(key: string, expiresIn: number): Promise<string> {
        return `https://example.com/${key}?expiresIn=${expiresIn}`;
    }

    public async getSignedUrlPUT(key: string, expiresIn: number): Promise<string> {
        return `https://example.com/${key}?expiresIn=${expiresIn}`;
    }

    public async getSignedUrlDELETE(key: string, expiresIn: number): Promise<string> {
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

    it("ギャラリーに画像を追加できる", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");

        await galleryService.getSingedUploadUrl(
            uid, gallery.id, "test", "test", 1920, 1080
        );

        const updated = await galleryService.getGalleryById(gallery.id, uid, 0);
        expect(updated?.images.length).toEqual(1);
        expect(updated?.images[0].width).toEqual(1920);
        expect(updated?.images[0].height).toEqual(1080);
    });

    it("存在しないギャラリーに画像を追加できない", async () => {
        await expect((async () => {
            await galleryService.getSingedUploadUrl(
                "test", "test", "test", "test", 1920, 1080
            );
        })()).rejects.toThrowError("Gallery not found");
    });

    it("他人のギャラリーに画像を追加できない", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");

        const uid2 = await createUser("Bad User");

        await expect((async () => {
            await galleryService.getSingedUploadUrl(
                uid2, gallery.id, "test", "test", 1920, 1080
            );
        })()).rejects.toThrowError("Gallery not found");
    });

    it("URLに署名できる（PUT）", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");

        const url = await galleryService.getSingedUploadUrl(
            uid, gallery.id, "test", "test", 1920, 1080
        );

        expect(typeof url.imageUploadUrl).toBe("string");
        expect(typeof url.thumbnailUploadUrl).toBe("string");
    });

    it("URLの署名の有効期限が適切（PUT）", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");

        const url = await galleryService.getSingedUploadUrl(
            uid, gallery.id, "test", "test", 1920, 1080
        );

        expect(url.imageUploadUrl.endsWith("expiresIn=30")).toBeTruthy();
        expect(url.thumbnailUploadUrl.endsWith("expiresIn=60")).toBeTruthy();
    });

    it("URLに署名できる（GET）", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");
        await prismock.image.create({
            data: {
                storageKey: "testImage",
                thumbnailKey: "testThumbnail",
                userId: uid,
                galleryId: gallery.id,
                blurhash: "dummy",
                sha256Hash: "dummy",
                width: 1920,
                height: 1080,
            }
        });

        const url = await galleryService.getSignedImageUrl(uid, "testImage", false);
        expect(url).not.toBeNull();

        const thumbnail = await galleryService.getSignedImageUrl(uid, "testThumbnail", true);
        expect(thumbnail).not.toBeNull();
    });

    it("URLの署名の有効期限が適切（GET）", async () => {
        const uid = await createUser("test");
        const gallery = await galleryService.createGallery(uid, "test");
        await prismock.image.create({
            data: {
                storageKey: "testImage",
                thumbnailKey: "testThumbnail",
                userId: uid,
                galleryId: gallery.id,
                blurhash: "dummy",
                sha256Hash: "dummy",
                width: 1920,
                height: 1080,
            }
        });

        const url = await galleryService.getSignedImageUrl(uid, "testImage", false);
        expect(url?.endsWith("expiresIn=15")).toBeTruthy();

        const thumbnail = await galleryService.getSignedImageUrl(uid, "testThumbnail", true);
        expect(thumbnail?.endsWith("expiresIn=15")).toBeTruthy();
    });
});
