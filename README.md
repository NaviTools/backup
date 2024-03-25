# Backup tool

Automatically generates backups to an [S3 Bucket](https://s3.console.aws.amazon.com/s3/)

## Setup

Requires the following variables:
```shell
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=
BACKUP_DATABASE_URL=
ROLLBAR_ACCESS_TOKEN=
```

## How to restore

Download the zip file and uncompress it.

You'll have a file that ends in `.dump` (ex: `my-backup.dump`)

Run the following command on the same directory as the `.dump` file exist:

```sh
psql -U <username> -h <host> -d <DB-Name> -f my-backup.dump
```
