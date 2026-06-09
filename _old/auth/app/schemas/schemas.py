from pydantic import BaseModel


class UserSchema(BaseModel):
    username: str
    role: str
    created_at: str


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str


class SignupSchema(BaseModel):
    username: str
    password: str
    password_conf: str
    email: str


class SignupResponseSchema(BaseModel):
    username: str
    message: str


class Complete2FASchema(BaseModel):
    username: str
    digit_key: str
