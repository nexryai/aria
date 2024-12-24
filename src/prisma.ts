import { PrismaClient } from "@prisma/client";

class PrismaRepository extends PrismaClient {
    async onModuleInit() {
        await this.$connect();
    }
}

const prisma = new PrismaRepository();

export const passkeyRepository = prisma.passkey;
export type IPasskeyRepository = typeof passkeyRepository

export const userRepository = prisma.user;
export type IUserRepository = typeof userRepository

export const galleryRepository = prisma.gallery;
export type IGalleryRepository = typeof galleryRepository

export const imageRepository = prisma.image;
export type IImageRepository = typeof imageRepository
