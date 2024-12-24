import { S3Client } from "@aws-sdk/client-s3";


export interface StorageService {
    // S3の場合Presigned URLを返すことを想定
    getUploadUrl: (key: string) => Promise<string>;
    getFileUrl: (key: string) => Promise<string>;
}

export class S3StorageService implements StorageService {
    constructor(
        private readonly bucket: string,
        private readonly region: string,

    ) {}

    public async getUploadUrl(key: string): Promise<string> {
        const url = await getSignedUrl(this.s3Client, {
            region: this.region,
            endpoint: `https://${this.bucket}.s3.amazonaws.com`,
            method: "PUT",
            key,
            expires: 60 * 60,
            query: {
                Bucket: this.bucket,
                Key: key,
            },
        });

        return url;
    }

    public async getFileUrl(key: string): Promise<string> {
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
}
