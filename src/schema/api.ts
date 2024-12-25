import { Gallery, Image } from "@prisma/client";

export interface GallerySummary extends Gallery {
    images: null;
    thumbnail: string;
}

export interface GalleryWithImages extends Gallery {
    images: Image[];
}
