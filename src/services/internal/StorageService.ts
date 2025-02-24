import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface IStorageService {
    getSignedUrlGET(key: string, expiresIn: number): Promise<string>;
    getSignedUrlPUT(key: string, expiresIn: number): Promise<string>;
    getSignedUrlDELETE(key: string, expiresIn: number): Promise<string>;
}

export class AwsStorageService implements IStorageService {
    constructor(
        private readonly s3Client: S3Client,
        private readonly s3Bucket: string
    ) {}

    public async getSignedUrlGET(key: string, expiresIn: number): Promise<string> {
        return getSignedUrl(this.s3Client, new GetObjectCommand({
            Bucket: this.s3Bucket,
            Key: key
        }), { expiresIn });
    }

    public async getSignedUrlPUT(key: string, expiresIn: number): Promise<string> {
        return await getSignedUrl(this.s3Client, new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
            ACL: "private",
        }), { expiresIn });
    }

    public async getSignedUrlDELETE(key: string, expiresIn: number): Promise<string> {
        return await getSignedUrl(this.s3Client, new DeleteObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
        }), { expiresIn });
    }
}
