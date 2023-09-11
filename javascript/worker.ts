import { parentPort } from 'worker_threads';
import { Client } from 'pg';
import { pipeline } from 'node:stream/promises';
import { from as copyFrom } from 'pg-copy-streams';
import fs from 'fs';

const pgConn = new Client({
  database: "codes-db",
  host: "localhost",
  user: "codes-db",
  password: "codes-db",
  port: 6492
});

parentPort?.on('message', async (filename) => {
  await pgConn.connect();
  try {
    const fileStream = fs.createReadStream(filename);
    const copyPsqlStream = pgConn.query(copyFrom(`COPY codes(code) FROM STDIN WITH (FORMAT CSV)`));
    await pipeline(fileStream, copyPsqlStream);
    console.log('writeeee')
    parentPort?.postMessage('done');
  } catch (err) {
    console.log(err)
    parentPort?.postMessage(`Error: ${err}`);
  }
});
