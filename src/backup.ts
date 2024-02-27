import { PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { exec, execSync } from "child_process";
import { createReadStream, unlink, statSync } from "fs";
import { filesize } from "filesize";
import {basename} from "path";

import { env } from "./env";

const uploadToS3 = async ({ name, path }: { name: string, path: string }) => {
    console.log("Uploading backup to S3...");

    const bucket = env.AWS_S3_BUCKET;

    const clientOptions: S3ClientConfig = {
        region: env.AWS_S3_REGION,
    }

    if (env.AWS_S3_ENDPOINT) {
        console.log(`Using custom endpoint: ${env.AWS_S3_ENDPOINT}`)
        clientOptions['endpoint'] = env.AWS_S3_ENDPOINT;
    }

    const client = new S3Client(clientOptions);

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: name,
            Body: createReadStream(path),
        })
    )

    console.log("Backup uploaded to S3...");
}

const dumpToFile = async (path: string) => {
    console.log("Dumping DB to file...");

    await new Promise((resolve, reject) => {
        exec(
            `pg_dump --dbname=${env.BACKUP_DATABASE_URL} > ${path}`,
            (error, stdout, stderr) => {
                if (error) {
                    reject({ error: JSON.stringify(error), stderr });
                    return;
                }

                // not all text in stderr will be a critical error, print the error / warning
                if (stderr != "") {
                    console.log({ stderr: stderr.trimEnd() });
                }

                console.log("Backup archive file is valid");
                console.log("Backup filesize:", filesize(statSync(path).size));

                // if stderr contains text, let the user know that it was potently just a warning message
                if (stderr != "") {
                    console.log(`Potential warnings detected; Please ensure the backup file "${basename(path)}" contains all needed data`);
                }

                resolve(undefined);
            }
        );
    });

    console.log("DB dumped to file...");
}

const deleteFile = async (path: string) => {
    console.log("Deleting file...");
    await new Promise((resolve, reject) => {
        unlink(path, (err) => {
            reject({ error: JSON.stringify(err) });
            return;
        });
        resolve(undefined);
    })
}

export const backup = async (): Promise<string> => {
    console.log(`Initiating DB backup by ${env.SERVICE_NAME}...`);

    let date = new Date().toISOString()
    const timestamp = date.replace(/[:.]+/g, '-')
    const filePattern = `backup-${timestamp}-${env.SERVICE_NAME}`;
    const filename = `${filePattern}.dump`
    const filepath = `/tmp/${filename}`

    await dumpToFile(filepath);

    const zipFile = `/tmp/${filePattern}.zip`;

    execSync(`zip ${zipFile} ${filepath}`);
    console.log("Ziped filesize:", filesize(statSync(zipFile).size));

    await uploadToS3({ name: `${filePattern}.zip`, path: zipFile });
    await deleteFile(filepath);

    console.log("DB backup complete...");

    return filename;
}
