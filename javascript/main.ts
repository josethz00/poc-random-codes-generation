import { BunFile } from 'bun';
import pg from 'pg';
import redis from 'redis';

const dbPool = new pg.Pool({
    host: 'localhost',
    port: 6492,
    password: 'codes-db',
    user: 'codes-db',
    database: 'codes-db'
});
const redisConn = redis.createClient({
    url: 'redis://localhost:6479'
});

const desiredCodesAmount: number = console.write('How many codes do you want to generate?   ');
const startTime: number = Date.now();
const filename = "codes_to_insert.txt";
const existingCodes: string[] = await redisConn.sMembers('codes');
const BATCH_SIZE = 1600;
const codesBatchSet: Set<string> = new Set();
const codesBatchTxtArray: string[] = [];
const codesBatchCsvArray: string[] = [];
const filenameCsv = "codes_to_insert.csv";

function flushToTxtFile(fileObj: BunFile, buffer: string[]) {
    const writer = fileObj.writer();
    writer.write(buffer.join('\n'));
    writer.flush();
    writer.end();
    buffer.length = 0;
}

function flushToCsvFile(fileObj: BunFile, buffer: string[]) {
    const writer = fileObj.writer();
    writer.write(buffer.join('\n'));
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
        existingCodes.push(code)
    });
}