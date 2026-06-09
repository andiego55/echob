from random import randint

def generate_key():

    secret_key1 = [str(randint(0, 9)) for i in range(0, 3)]
    secret_key2 = [str(randint(0, 9)) for i in range(0, 3)]
    secret_key1 = ''.join(secret_key1)
    secret_key2 = ''.join(secret_key2)
    key = secret_key1 + ' ' + secret_key2

    return(key)