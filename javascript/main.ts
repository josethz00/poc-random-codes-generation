import * as fs from 'fs';
import * as pg from 'pg';
import * as redis from 'redis';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { Worker } from 'worker_threads';
import { generateCode } from './generate-code';

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

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const desiredCodesAmount = await new Promise<number>(resolve => {
        rl.question('How many codes do you want to generate?   ', answer => {
            rl.close();
            resolve(Number(answer));
        });
    });

    const startTime: number = Date.now();
    const existingCodes: Set<string> = new Set(await redisConn.sMembers('codes'));
    const BATCH_SIZE = 1600;
    const codesBatchSet: Set<string> = new Set();
    const codesBatchArray: string[] = [];
    const filenameCsv = "codes_to_insert.csv";
    const csvFileBuffer: string[] = [];

    fs.writeFileSync(filenameCsv, '');

    function flushToCsvFile(fileObj: string, buffer: string[]): void {
        fs.appendFileSync(fileObj, buffer.join(''));
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
            flushToCsvFile(filenameCsv, csvFileBuffer);
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
        flushToCsvFile(filenameCsv, csvFileBuffer);
    }

    spawn('split', ['-l', String(Math.floor(desiredCodesAmount / 5)), filenameCsv, 'outcodes_']);

    const filePrefixes = ['aa', 'ab', 'ac', 'ad', 'ae'];
    filePrefixes.forEach(prefix => {
        const worker = new Worker(path.join(__dirname, 'worker.js'));
        worker.postMessage(`outcodes_${prefix}`);
    });

    const endTime: number = Date.now();

    console.log(`Time elapsed: ${(endTime - startTime) / 1000} seconds.`);
};

main().catch(err => console.error(err));