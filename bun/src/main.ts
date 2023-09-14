import * as pg from 'pg';
import * as redis from 'redis';
import { generateCode } from './generate-code';
import { runWorker } from './run-worker';
import { BunFile } from 'bun';

const dbPool = new pg.Pool({
    host: 'localhost',
    port: 6492,
    password: 'codes-db',
    user: 'codes-db',
    database: 'codes-db',
    max: 4,
});

const redisConn = redis.createClient({
    url: 'redis://localhost:6479'
});

const main = async () => {
    await redisConn.connect();

    process.stdout.write('How many codes do you want to generate?   ');
    let desiredCodesAmount = 0;

    for await (const line of console) {
        desiredCodesAmount = Number(line);
        break;
    }


    const startTime: number = Date.now();
    const existingCodes: Set<string> = new Set(await redisConn.sMembers('codes'));
    const BATCH_SIZE = 1600;
    const codesBatchSet: Set<string> = new Set();
    const codesBatchArray: string[] = [];
    const csvFileBuffer: string[] = [];
    const csvFile = Bun.file("codes_to_insert.cs");

    function flushToCsvFile(fileObj: BunFile, buffer: string[]): void {
        const writer = fileObj.writer();
        writer.write(buffer.join(''));
        writer.flush();
        writer.end();
        buffer.length = 0;
    }

    const dbConn = await dbPool.connect();
    const codesFromDb: string[] = await dbConn.query('SELECT * FROM codes')
        .then(res => res.rows.map(row => row.code));
    dbConn.release();

    if (codesFromDb.length > 0) {
        codesFromDb.forEach(code => {
            redisConn.sAdd('codes', code);
            existingCodes.add(code)
        });
    }
    for (let i = 0; i < desiredCodesAmount; i++) {
        let code = '';
        do {
            code = generateCode();
        } while (existingCodes.has(code) || codesBatchSet.has(code));

        codesBatchSet.add(code);
        codesBatchArray.push(code);
        existingCodes.add(code);
        csvFileBuffer.push(code + "\n");

        if (csvFileBuffer.length >= BATCH_SIZE) {
            flushToCsvFile(csvFile, csvFileBuffer);
            redisConn.sAdd('codes', codesBatchArray);
            codesBatchSet.clear();
            codesBatchArray.length = 0;
        }

        if (i % 10000 === 0) {
            console.log(`Generated ${i} codes so far... `);
        }
    }

    if (codesBatchSet.size > 0) {
        redisConn.sAdd('codes', codesBatchArray);
        codesBatchSet.clear();
        codesBatchArray.length = 0;
    }

    if (csvFileBuffer.length > 0) {
        flushToCsvFile(csvFile, csvFileBuffer);
    }

    Bun.spawn(['split', '-l', String(Math.floor(desiredCodesAmount / 5)), csvFile.name!, 'outcodes_']);

    const filePrefixes = ['aa', 'ab', 'ac', 'ad', 'ae'];
    const workerPromises = filePrefixes.map(prefix => runWorker(prefix));
    await Promise.all(workerPromises);

    const endTime: number = Date.now();

    console.log(`Time elapsed: ${(endTime - startTime) / 1000} seconds.`);
};

main().catch(err => console.error(err));