const { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;

/**
 * Upload a single file buffer to R2.
 * @param {string} key  - Object key, e.g. "bubble-shooter/script.js"
 * @param {Buffer} body - File contents
 */
const uploadToR2 = async (key, body) => {
    const contentType = mime.lookup(key) || 'application/octet-stream';
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
};

/**
 * Delete all objects under a prefix (e.g. "bubble-shooter/").
 * @param {string} prefix - Key prefix to delete
 */
const deleteR2Folder = async (prefix) => {
    // List all objects with the prefix
    let continuationToken;
    do {
        const list = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        }));

        const objects = (list.Contents || []).map(({ Key }) => ({ Key }));
        if (objects.length > 0) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: BUCKET,
                Delete: { Objects: objects },
            }));
        }

        continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuationToken);
};

module.exports = { uploadToR2, deleteR2Folder };
