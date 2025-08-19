# Backup tool

Automatically generates backups to an [S3 Bucket](https://s3.console.aws.amazon.com/s3/)

Supports both PostgreSQL and MariaDB databases.

## Setup

Requires the following variables:
```shell
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=
BACKUP_DATABASE_URL=
DATABASE_TYPE=postgres  # or 'mariadb'
SERVICE_NAME=
SENTRY_DSN=
```

### Database Connection URLs

For PostgreSQL:
```
postgresql://username:password@host:port/database
```

For MariaDB:
```
mysql://username:password@host:port/database
```

## How to restore

Download the zip file and uncompress it.

You'll have a file that ends in `.sql` (ex: `my-backup.sql`)

### PostgreSQL Restore
Run the following command on the same directory as the `.sql` file exists:

```sh
psql -U <username> -h <host> -d <DB-Name> -f my-backup.sql
```

### MariaDB Restore
Run the following command on the same directory as the `.sql` file exists:

```sh
mysql -u <username> -p -h <host> <DB-Name> < my-backup.sql
```
