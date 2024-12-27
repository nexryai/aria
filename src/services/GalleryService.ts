import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { type IGalleryRepository, IImageRepository } from "@/prisma";
import { GallerySummary } from "@/schema/api";
import { type StorageService } from "@/services/internal/StorageService";
import { type Gallery } from "@prisma/client";


export class GalleryService {
    constructor(
        private readonly galleryRepository: IGalleryRepository,
        private readonly imageRepository: IImageRepository,
        private readonly storageService: StorageService
    ) {}

    public async getGalleryById(galleryId: string, uid: string, offset: number): Promise<Gallery | null> {
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

    public async getSingedUploadUrl(galleryId: string, uid: string, sha256Hash: string, blurhash: string, width: number, height: number): Promise<{imageUploadUrl: string, thumbnailUploadUrl: string}> {
        const storageKey = crypto.randomUUID();
        const thumbnailKey = crypto.randomUUID();

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

        const imageUploadUrl = await this.storageService.getSingedUrlPUT(storageKey, 30);
        const thumbnailUploadUrl = await this.storageService.getSingedUrlPUT(thumbnailKey, 60);

        return {imageUploadUrl, thumbnailUploadUrl};
    }
}
