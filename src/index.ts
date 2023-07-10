import { CronJob } from "cron";

import { backup } from "./backup";
import { env } from "./env";
import Rollbar, { LogArgument } from "rollbar";

var rollbar = new Rollbar({
    accessToken: env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
});

const job = new CronJob(env.BACKUP_CRON_SCHEDULE, async () => {
    try {
        const fileUploaded = await backup();
        rollbar.log(`Successfully deployed file to S3 bucket:`, fileUploaded);
    } catch (error) {
        console.error("Error while running backup: ", error);
        rollbar.error(error as LogArgument);
    }
});

job.start();

rollbar.info("New deployed triggered by commit", env.RAILWAY_GIT_COMMIT_SHA);

console.log("Backup cron scheduled...");
