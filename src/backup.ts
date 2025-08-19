import { PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { exec, execSync } from "child_process";
import { createReadStream, unlink, statSync } from "fs";
import { filesize } from "filesize";
import { basename } from "path";
import { URL } from "url";

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

interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

const parseDatabaseUrl = (url: string): DatabaseConfig => {
    const parsedUrl = new URL(url);

    return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || (env.DATABASE_TYPE === 'postgres' ? 5432 : 3306),
        username: parsedUrl.username,
        password: parsedUrl.password,
        database: parsedUrl.pathname.slice(1), // Remove leading slash
    };
};

const dumpPostgresql = async (path: string) => {
    console.log("Dumping PostgreSQL database to file...");

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

                console.log("PostgreSQL backup archive file is valid");
                console.log("Backup filesize:", filesize(statSync(path).size));

                // if stderr contains text, let the user know that it was potently just a warning message
                if (stderr != "") {
                    console.log(`Potential warnings detected; Please ensure the backup file "${basename(path)}" contains all needed data`);
                }

                resolve(undefined);
            }
        );
    });
};

const dumpMariaDB = async (path: string) => {
    console.log("Dumping MariaDB database to file...");

    const dbConfig = parseDatabaseUrl(env.BACKUP_DATABASE_URL);

    const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} > ${path}`;

    await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error: JSON.stringify(error), stderr });
                return;
            }

            // not all text in stderr will be a critical error, print the error / warning
            if (stderr != "") {
                console.log({ stderr: stderr.trimEnd() });
            }

            console.log("MariaDB backup archive file is valid");
            console.log("Backup filesize:", filesize(statSync(path).size));

            // if stderr contains text, let the user know that it was potently just a warning message
            if (stderr != "") {
                console.log(`Potential warnings detected; Please ensure the backup file "${basename(path)}" contains all needed data`);
            }

            resolve(undefined);
        });
    });
};

const dumpToFile = async (path: string) => {
    console.log(`Dumping ${env.DATABASE_TYPE} database to file...`);

    if (env.DATABASE_TYPE === 'postgres') {
        await dumpPostgresql(path);
    } else if (env.DATABASE_TYPE === 'mariadb') {
        await dumpMariaDB(path);
    } else {
        throw new Error(`Unsupported database type: ${env.DATABASE_TYPE}`);
    }

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
    console.log(`Initiating ${env.DATABASE_TYPE} backup by ${env.SERVICE_NAME}...`);

    let date = new Date().toISOString()
    const timestamp = date.replace(/[:.]+/g, '-')
    const filePattern = `backup-${env.DATABASE_TYPE}-${timestamp}-${env.SERVICE_NAME}`;
    const filename = `${filePattern}.sql`
    const filepath = `/tmp/${filename}`

    await dumpToFile(filepath);

    const zipFile = `/tmp/${filePattern}.zip`;

    execSync(`zip ${zipFile} ${filepath}`);
    console.log("Ziped filesize:", filesize(statSync(zipFile).size));

    await uploadToS3({ name: `${filePattern}.zip`, path: zipFile });
    await deleteFile(filepath);

    console.log(`${env.DATABASE_TYPE} backup complete...`);

    return filename;
}
