import { type IGalleryRepository } from "@/prisma";
import { type Gallery } from "@prisma/client";

export class GalleryService {
    constructor(
        private readonly galleryRepository: IGalleryRepository
    ) {}

    public async getGalleryById(gid: string): Promise<Gallery | null> {
        return this.galleryRepository.findUnique({ where: { id: gid } });
    }

    public getGalleriesByUserId(uid: string): Promise<Gallery[]> {
        return this.galleryRepository.findMany({ where: { userId: uid } });
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
