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
with open(filename, "w") as f:
    for i in range(desired_codes_amount):
        codes = redisconn.smembers("codes")

        if len(codes) > 0:
            # Get the codes from the redis key
            redis_codes = redisconn.smembers("codes")

            # generate ONE code and compare it with the redis codes array
            code = generate_code()

            while code in redis_codes:
                code = generate_code()

            # Add the code to the redis key
            redisconn.sadd("codes", code)

            # Write the code to the file
            f.write(code + "\n")

        else:
            code = generate_code()
            redisconn.sadd("codes", code)

            f.write(code + "\n")

        if i % 10000 == 0:
            print(f"Generated {i} codes so far...")

# Now use COPY to bulk load the data into PostgreSQL
cursor = pgconn.cursor()
with open(filename, "r") as f:
    cursor.copy_from(f, 'codes', columns=('code',))
pgconn.commit()

end_time = time.time()

print(f"Time elapsed: {end_time - start_time} seconds")
