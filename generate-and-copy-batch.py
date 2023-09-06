import time
import psycopg2
import redis
from generate_codes import generate_code

pgconn = psycopg2.connect(database="codes-db",
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

if not existing_codes:
    cursor = pgconn.cursor()
    cursor.execute("SELECT code FROM codes")
    codes_from_db = {row[0] for row in cursor.fetchall()}
    redisconn.sadd("codes", *codes_from_db)
    existing_codes.update(codes_from_db)
    cursor.close()

with open(filename, "w") as f:
    for i in range(desired_codes_amount):
        code = generate_code()

        while code in existing_codes or code in codes_batch:
            code = generate_code()

        existing_codes.add(code)
        codes_batch.add(code)
        file_buffer.append(code + "\n")

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

redisconn.delete("codes")

cursor = pgconn.cursor()
with open(filename, "r") as f:
    cursor.copy_from(f, 'codes', columns=('code',))
pgconn.commit()

end_time = time.time()

print(f"Time elapsed: {end_time - start_time} seconds")
