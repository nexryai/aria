import { type IGalleryRepository, IImageRepository } from "@/prisma";
import { GallerySummary, GalleryWithImages } from "@/schema/api";
import { type IStorageService } from "@/services/internal/StorageService";
import { type Gallery } from "@prisma/client";


export class GalleryService {
    constructor(
        private readonly galleryRepository: IGalleryRepository,
        private readonly imageRepository: IImageRepository,
        private readonly storageService: IStorageService
    ) {}

    public async getGalleryById(galleryId: string, uid: string, offset: number): Promise<GalleryWithImages | null> {
        const found = await this.galleryRepository.findUnique(
            {
                where: {
                    id: galleryId,
                    userId: uid
                },
                include: {
                    images: {
                        skip: offset,
                        take: 20
                    }
                }
            }
        );

        if (!found) {
            return null;
        }

        // WHEREでuserIdを指定しているものの、バグか何かで渡されるUIDがundefinedになってたりすると他人のギャラリーが見れてしまうので一応チェック
        if (found.userId !== uid) {
            throw new Error("Integrity check failed: may be caused by bug(s) or leak of credentials");
        }

        return found;
    }

    public async getGalleriesByUserId(uid: string): Promise<GallerySummary[]> {
        const galleries =  await this.galleryRepository.findMany(
            {
                where: { userId: uid },
                include: {
                    images: {
                        take: 1
                    }
                }
            }
        );

        return await Promise.all(galleries.map(async (gallery) => {
            if (gallery.userId !== uid) {
                throw new Error("Integrity check failed: may be caused by bug(s) or leak of credentials");
            }

            return {
                ...gallery,
                images: null,
                thumbnail: gallery.images[0]?.thumbnailKey ?? "/placeholder.png"
            };
        }));
    }

    public createGallery(uid: string, name: string): Promise<Gallery> {
        return this.galleryRepository.create({
            data: {
                name: name,
                user: {
                    connect: { id: uid }
                }
            }
        });
    }

    public async deleteGallery(uid: string, galleryId: string): Promise<void> {
        const found = await this.galleryRepository.findUnique({
            where: {
                id: galleryId,
                userId: uid
            }
        });

        if (!found) {
            throw new Error("Gallery not found");
        }

        if (found.userId !== uid || !uid) {
            throw new Error("Integrity check failed: may be caused by bug(s) or leak of credentials");
        }

        // remove images
        // todo: オブジェクトストレージからも削除する
        await this.imageRepository.deleteMany({
            where: {
                galleryId: galleryId,
                userId: uid
            }
        });

        await this.galleryRepository.delete({
            where: {
                id: galleryId,
                userId: uid
            }
        });
    }

    public async getSignedImageUrl(uid: string, key: string, isThumbnail: boolean): Promise<string | null> {
        const found = await this.imageRepository.findUnique({
            where:
                isThumbnail ? {
                    thumbnailKey: key,
                    userId: uid
                } : {
                    storageKey: key,
                    userId: uid
                }
        });

        if (!found) {
            return null;
        }

        if (found.userId !== uid) {
            throw new Error("Integrity check failed: may be caused by bug(s) or leak of credentials");
        }

        return this.storageService.getSignedUrlGET(isThumbnail ? found.thumbnailKey : found.storageKey, 15);
    }

    public async getSignedUploadUrl(uid: string, galleryId: string, sha256Hash: string, blurhash: string, width: number, height: number): Promise<{imageUploadUrl: string, thumbnailUploadUrl: string}> {
        const storageKey = crypto.randomUUID();
        const thumbnailKey = crypto.randomUUID();

        const gallery = await this.galleryRepository.findUnique({
            where: {
                id: galleryId,
                userId: uid
            }
        });

        if (!gallery) {
            throw new Error("Gallery not found");
        }

        const image = await this.imageRepository.create({
            data: {
                storageKey: storageKey,
                thumbnailKey: thumbnailKey,
                blurhash: blurhash,
                width: width,
                height: height,
                sha256Hash: sha256Hash,
                gallery: {
                    connect: {
                        id: galleryId,
                        userId: uid
                    }
                },
                user: {
                    connect: {
                        id: uid
                    }
                }
            }
        });

        if (image.userId !== uid) {
            await this.imageRepository.delete({where: {id: image.id}});
            throw new Error("Integrity check failed: may be caused by bug(s) or leak of credentials");
        }

        const imageUploadUrl = await this.storageService.getSignedUrlPUT(storageKey, 30);
        const thumbnailUploadUrl = await this.storageService.getSignedUrlPUT(thumbnailKey, 60);

        return {imageUploadUrl, thumbnailUploadUrl};
    }

    public async deleteImage(uid: string, galleryId: string, imageId: string): Promise<void> {
        const where = {
            id: imageId,
            galleryId: galleryId,
            userId: uid
        };

        const found = await this.imageRepository.findUnique({ where });
        if (!found) {
            throw new Error("Image not found");
        }

        if (found.id != imageId || found.userId !== uid) {
            throw new Error("Integrity check failed: may be caused by bug(s) or leak of credentials");
        }

        await Promise.all([
            this.storageService.deleteItem(found.storageKey),
            this.storageService.deleteItem(found.thumbnailKey)
        ]);

        await this.imageRepository.delete({ where });
    }
}
