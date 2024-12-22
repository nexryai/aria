import { type IGalleryRepository } from "@/prisma";
import { GallerySummary } from "@/schema/api";
import { type Gallery } from "@prisma/client";

export class GalleryService {
    constructor(
        private readonly galleryRepository: IGalleryRepository
    ) {}

    public async getGalleryById(gid: string, offset: number): Promise<Gallery | null> {
        return this.galleryRepository.findUnique(
            {
                where: {
                    id: gid
                },
                include: {
                    images: {
                        skip: offset,
                        take: 20
                    }
                }
            }
        );
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
            return {
                ...gallery,
                images: null,
                thumbnail: gallery.images[0]?.storageKey ?? "/placeholder.png"
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
}
