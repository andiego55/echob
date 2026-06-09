
import os
from datetime import datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from jose import jwt
from config import service_configuration
import base64


class JWTHandler:

    def __init__(self, subject: Any = None,
                 access_token_expires_minutes: int = service_configuration['authentication_settings']['ACCESS_TOKEN_EXPIRES_MINUTES'],
                 refresh_token_expires_minutes: int = service_configuration['authentication_settings']['REFRESH_TOKEN_EXPIRES_MINUTES'],
                 algorithm="HS256",
                 jwt_secret_key=service_configuration['commons']['JWT_SECRET_KEY'],
                 jwt_refresh_secret_key=service_configuration['commons']['JWT_REFRESH_SECRET_KEY']):
        self.subject = subject
        self.access_token_expires_minutes = access_token_expires_minutes
        self.refresh_token_expires_minutes = refresh_token_expires_minutes
        self.algorithm = algorithm
        self.jwt_secret_key = jwt_secret_key
        self.jwt_refresh_secret_key = jwt_refresh_secret_key
        self.keys = self.create_keys_RSA()

    def create_access_token(self, expires_delta: int = None) -> str:
        if expires_delta is not None:
            expires_delta = datetime.utcnow() + expires_delta
        else:
            expires_delta = datetime.utcnow() + timedelta(minutes=self.access_token_expires_minutes)

        payload = {"exp": expires_delta, "sub": str(self.subject)}
        signed_token = jwt.encode(payload, self.jwt_secret_key, self.algorithm)
        base64.b64encode(signed_token.encode())
        return signed_token

    def create_refresh_token(self, expires_delta: int = None) -> str:
        if expires_delta is not None:
            expires_delta = datetime.utcnow() + expires_delta
        else:
            expires_delta = datetime.utcnow() + timedelta(minutes=self.refresh_token_expires_minutes)

        to_encode = {"exp": expires_delta, "sub": str(self.subject)}
        signed_token = jwt.encode(to_encode, self.jwt_refresh_secret_key, self.algorithm)
        base64.b64encode(signed_token.encode())
        return signed_token

    @staticmethod
    def create_keys_RSA():
        # Generate the private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )

        # Serialize the private key
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )

        # Generate the public key
        public_key = private_key.public_key()

        # Serialize the public key
        public_key_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        return {
            'public_key': public_key_pem,
            'private_key': private_key_pem
        }

    def create_access_token_RSA(self, expires_delta: int = None) -> str:
        if expires_delta is not None:
            expires_delta = datetime.utcnow() + expires_delta
        else:
            expires_delta = datetime.utcnow() + timedelta(minutes=self.access_token_expires_minutes)

        # Create the payload
        payload = {"exp": expires_delta, "sub": str(self.subject)}

        # Sign the token using the private key
        signed_token = jwt.encode(payload, self.keys['private_key'], algorithm='RS256')

        return signed_token

    def create_refresh_token_RSA(self, expires_delta: int = None) -> str:
        if expires_delta is not None:
            expires_delta = datetime.utcnow() + expires_delta
        else:
            expires_delta = datetime.utcnow() + timedelta(minutes=self.refresh_token_expires_minutes)

        # Create the payload
        payload = {"exp": expires_delta, "sub": str(self.subject)}

        # Sign the token using the private key
        signed_token = jwt.encode(payload, self.keys['private_key'], algorithm='RS256')

        return signed_token

    def verify_token_RSA(self, signed_token, public_key=None):
        if public_key is None:
            public_key=self.keys['public_key']
        try:
            decoded_payload = jwt.decode(signed_token, public_key, algorithms=['RS256'])
            print("Token is valid")
        except InvalidTokenError:
            print("Invalid token")

        return decoded_payload

if __name__ == '__main__':
    jwt_handler = JWTHandler(subject='username_from_db')
    access_token = jwt_handler.create_access_token()
    refresh_token = jwt_handler.create_refresh_token()
    jwt.decode(access_token, jwt_handler.jwt_secret_key)

    rsa_token = jwt_handler.create_access_token_RSA()
    jwt_handler.verify_token_RSA(signed_token=rsa_token, public_key=jwt_handler.keys['public_key'])

