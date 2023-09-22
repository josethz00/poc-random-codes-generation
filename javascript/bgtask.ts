import { spawn } from 'child_process';
import { runWorker } from './run-worker';

process.on('message', async ({ filenameCsv, desiredCodesAmount }) => {
    try {
        spawn('split', ['-l', String(Math.floor(desiredCodesAmount / 5)), filenameCsv, 'outcodes_']);
        const filePrefixes = ['aa', 'ab', 'ac', 'ad', 'ae'];
        const workerPromises = filePrefixes.map(prefix => runWorker(prefix));
        await Promise.all(workerPromises);

        process.send!('done');
    } catch (err) {
        console.error("Error in background tasks:", err);
        process.exit(1);
    }
});
