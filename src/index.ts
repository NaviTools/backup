import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

import { backup } from "./backup";
import { env } from "./env";


Sentry.init({
    dsn: env.SENTRY_DSN,
    integrations: [
        new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
    release: env.SERVICE_NAME,
});

console.log(`Backup ${env.SERVICE_NAME} cron scheduled...`);

backup()
    .then(() => console.log(`Backup completed by ${env.SERVICE_NAME}`))
    .catch((e) => {
        console.error(e);
        Sentry.captureException(e);
    });


