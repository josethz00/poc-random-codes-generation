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

for i in range(desired_codes_amount):
    codes = redisconn.smembers("codes")

    if len(codes) > 0: 
        print("Codes already generated")
        print("Generate codes and compare them with the ones in the redis key 'codes'")

        # Get the codes from the redis key
        redis_codes = redisconn.smembers("codes")

        # generate ONE code and compare it with the redis codes array
        code = generate_code()

        while code in redis_codes:
            print("Code already exists - COLLISION")
            print("Generating another code")
            code = generate_code()

        print("Code generated successfully")

        # Add the code to the redis key
        redisconn.sadd("codes", code)

        cursor = pgconn.cursor()
        cursor.execute("INSERT INTO codes (code) VALUES (%s)", (code,))

        pgconn.commit()

        print("Code added to the database - 1")

    else:
        print("Codes not generated yet")
        print("Generate codes and add them to the redis key 'codes'")

        # generate first code and add it to the redis key
        code = generate_code()
        redisconn.sadd("codes", code)

        cursor = pgconn.cursor()
        cursor.execute("INSERT INTO codes (code) VALUES (%s)", (code,))
        pgconn.commit()

        print("Code added to the database - 2")

end_time = time.time()

print(f"Time elapsed: {end_time - start_time} seconds")