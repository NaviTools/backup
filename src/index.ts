import { backup } from "./backup";
import { env } from "./env";

console.log(`Backup ${env.SERVICE_NAME} cron scheduled...`);

backup()
    .then(() => console.log(`Backup completed by ${env.SERVICE_NAME}`))
    .catch((e) => console.error(e));


