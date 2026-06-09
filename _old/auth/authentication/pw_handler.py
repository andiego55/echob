import bcrypt


class PWHandler:

    def __init__(self, password: str):
        self.password = password
        self.password_utf8 = self.password.encode('utf-8')
        self.salt = bcrypt.gensalt(rounds=12)
        self.salt_decoded = self.salt.decode('utf-8')
        self.password_hashed = self.get_hashed_password()
        self.password_hashed_decoded = self.password_hashed.decode('utf-8')

    def get_hashed_password(self: str):
        self.password_hashed = bcrypt.hashpw(self.password_utf8, self.salt)
        return self.password_hashed

    def verify_password(self, password: str):
        if not isinstance(password, bytes):
            password = password.encode('utf-8')
        out = bcrypt.checkpw(password, self.password_hashed)
        return out

    @staticmethod
    def password_compare(password, password_hashed):
        if not isinstance(password, bytes):
            password = password.encode('utf-8')
        if not isinstance(password_hashed, bytes):
            password_hashed = password_hashed.encode('utf-8')
        out = bcrypt.checkpw(password, password_hashed)
        return out

if __name__ == '__main__':
    pw_handler = PWHandler('123')
    pw_handler.get_hashed_password()
    pw_handler.verify_password(password='123')
