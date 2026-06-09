#!/usr/bin/env python3

from fastapi import APIRouter
from db.db_reflection import *
from fastapi import status, HTTPException
from authentication.pw_handler import PWHandler
from authentication.jwt_handler import JWTHandler
from authentication.authenticate import get_authenticated_user, get_authorization_header
from datetime import datetime
from fastapi import Depends
from app.schemas.schemas import SignupSchema, SignupResponseSchema, UserSchema
from db.db_reflection import User
from db.database import DBSessionHandler
from sqlalchemy.exc import SQLAlchemyError, NoResultFound
from fastapi.responses import Response

router = APIRouter()


@router.post('/signup', summary="Create new user", response_model=SignupResponseSchema)
async def create_user(response: Response, user: SignupSchema):

    if user.password != user.password_conf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password not identical with password confirmation."
        )

    # Check if username already exists
    session_handler = DBSessionHandler(session_on_init=True)
    query = session_handler.session.query(User).filter(User.username == user.username)

    out = []
    for user in query:
        out.append(user)

    if len(out) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if username already exists
    query = session_handler.session.query(User).filter(User.email == user.email)

    out = []
    for user in query:
        out.append(user)

    if len(out) == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exist"
        )

    pwt_handler = PWHandler(password=user.password)
    jwt_handler = JWTHandler(subject=user.username)

    new_user = User(username=user.username,
                    password=pwt_handler.password_hashed_decoded,
                    salt=pwt_handler.salt_decoded,
                    email=user.email,
                    private_key=jwt_handler.keys['private_key'],
                    public_key=jwt_handler.keys['public_key'],
                    role='user',
                    auth_2f=False,
                    digit_code_2fa=None,
                    digit_code_expiration=None,
                    auth_2f_completed=None,
                    created_at=datetime.now())

    try:
        session_handler.session.add(new_user)
        session_handler.session.commit()
        msg = "Successfully imported user to db"
    except SQLAlchemyError as error:
        print(str(error))
        session_handler.session.rollback()
        msg = "Could not import user to db"

    token = {
        "access_token": jwt_handler.create_access_token(),
        "refresh_token": jwt_handler.create_refresh_token()
    }

    response.set_cookie(key='app_access', value=token['access_token'], max_age=60, httponly=False)
    response.set_cookie(key='app_refresh', value=token['refresh_token'], max_age=60, httponly=False)
    return {'username': user.username,
            'message': msg}
