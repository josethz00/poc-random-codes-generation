import string
from generate_codes import generate_code
import psycopg2.pool
import redis
import openpyxl
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
import itertools
import logging
import time

# Create the connection pool
db_pool = psycopg2.pool.SimpleConnectionPool(1, 5,
                                             database="codes-db",
                                             host="localhost",
                                             user="codes-db",
                                             password="codes-db",
                                             port="6492")

redisconn = redis.Redis(host="localhost", port=6479, db=0)

desired_codes_amount = int(input("How many codes do you want to generate?  "))

start_time = time.time()

filename = "codes_to_insert.txt"

existing_codes = set(redisconn.smembers("codes"))

BATCH_SIZE = 1600
codes_batch = set()
file_buffer = []

def flush_to_file(file_obj, buffer):
    file_obj.writelines(buffer)
    buffer.clear()

filename_xlsx = "codes_to_insert.xlsx"
wb = openpyxl.Workbook()
ws = wb.active

def save_xlsx():
    logging.info("Saving xlsx file...")
    wb.save(filename_xlsx)
    logging.info("Saved xlsx file")

# Using connection pool for PostgreSQL
pgconn = db_pool.getconn()
cursor = pgconn.cursor()
cursor.execute("SELECT code FROM codes")
codes_from_db = {row[0] for row in cursor.fetchall()}
cursor.close()
db_pool.putconn(pgconn)

if codes_from_db:
    redisconn.sadd("codes", *codes_from_db)
    existing_codes.update(codes_from_db)

with open(filename, "w") as f:
    for i in range(desired_codes_amount):
        code = generate_code()

        while code in existing_codes or code in codes_batch:
            code = generate_code()

        existing_codes.add(code)
        codes_batch.add(code)
        file_buffer.append(code + "\n")
        ws.append([code])

        if len(file_buffer) >= BATCH_SIZE:
            flush_to_file(f, file_buffer)
            redisconn.sadd("codes", *codes_batch)
            codes_batch.clear()

        if i % 10000 == 0:
            print(f"Generated {i} codes so far...")

    if codes_batch:
        redisconn.sadd("codes", *codes_batch)
        codes_batch.clear()

    if file_buffer:
        flush_to_file(f, file_buffer)

save_xlsx_thread = threading.Thread(target=save_xlsx)
save_xlsx_thread.start()

subprocess.run(["split", "-l", str(desired_codes_amount // 5), "codes_to_insert.txt", "outcodes_"])

def copy_to_db(filename):
    local_conn = db_pool.getconn()
    try:
        with local_conn.cursor() as local_cursor:
            with open(filename, "r") as f:
                local_cursor.copy_from(f, 'codes', columns=('code',))
            local_conn.commit()
    finally:
        db_pool.putconn(local_conn)

thread_pool = ThreadPoolExecutor(max_workers=5)
file_prefixes = [''.join(i) for i in itertools.product('a', string.ascii_lowercase)][:5]
for prefix in file_prefixes:
    thread_pool.submit(copy_to_db, f"outcodes_{prefix}")

thread_pool.shutdown(wait=True)
save_xlsx_thread.join()

end_time = time.time()

print(f"Time elapsed: {end_time - start_time} seconds")

# Close the pool when done
db_pool.closeall()
