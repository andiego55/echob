
from datetime import datetime
from fastapi import HTTPException, status, Security, Depends
from fastapi.security import OAuth2PasswordBearer

from db.database import DBSessionHandler
from db.db_reflection import User
from .jwt_handler import JWTHandler
from jose import jwt, ExpiredSignatureError
from pydantic import ValidationError
from .schemas import TokenPayload
from sqlalchemy.exc import SQLAlchemyError
from config import service_configuration


security = OAuth2PasswordBearer(
    tokenUrl=service_configuration['api_settings']["LOGIN_TOKEN_URL"],
    scheme_name="JWT"
)


async def get_authorization_header(authorization: str = Depends(security)):
    return authorization


def get_authenticated_user(token: str = Security(security)) -> User:
    try:
        jwt_handler = JWTHandler()

        payload = jwt.decode(
            token,
            jwt_handler.jwt_secret_key,
            algorithms=[jwt_handler.algorithm]
        )
        token_data = TokenPayload(**payload)

    except ExpiredSignatureError:
        raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except(jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        session_handler = DBSessionHandler(session_on_init=True)
        user = session_handler.session.query(User).filter(User.username == token_data.sub).one()
    except SQLAlchemyError as error:
        print(str(error))
        session_handler.session.rollback()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find user",
        )

    return user
