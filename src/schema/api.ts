import { Gallery } from "@prisma/client";

export interface GallerySummary extends Gallery {
    images: null;
    thumbnail: string;
}
