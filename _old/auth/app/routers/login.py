#!/usr/bin/env python3

from fastapi import APIRouter
from db.db_reflection import User
from fastapi import status, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from authentication.pw_handler import PWHandler
from authentication.jwt_handler import JWTHandler
from db.database import DBSessionHandler
from fastapi.responses import Response
from fastapi import Depends
from app.schemas.schemas import UserSchema
from authentication.authenticate import get_authenticated_user, get_authorization_header
from sqlalchemy.exc import SQLAlchemyError, NoResultFound

router = APIRouter()


@router.post('/login', summary="Create access and refresh tokens - served as cookie")
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):

    session_handler = DBSessionHandler(session_on_init=True)
    user = session_handler.session.query(User).filter(User.username == form_data.username).one()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
        )

    if user.auth_2f and not user.auth_2f_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not completed 2-fa"
        )

    if not PWHandler.password_compare(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )

    jwt_handler = JWTHandler(subject=user.username)

    token = {
        "access_token": jwt_handler.create_access_token(),
        "refresh_token": jwt_handler.create_refresh_token()
    }

    response.set_cookie(key='app_access', value=token['access_token'], max_age=6000, httponly=False)
    response.set_cookie(key='app_refresh', value=token['refresh_token'], max_age=6000, httponly=False)
    return token


@router.get('/authorization')
def show_authorization_header(authorization=Depends(get_authorization_header)):
    return authorization


@router.get('/current_user', response_model=UserSchema)
def current_user(authorized_user=Depends(get_authenticated_user)):
    try:
        return UserSchema(**{'username': authorized_user.username,
                             'role': authorized_user.role,
                             'created_at': authorized_user.created_at})
    except NoResultFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find user",
        )
    except SQLAlchemyError as error:
        print(str(error))


@router.post('/refresh', summary="Refresh route for creating new access and refresh tokens")
async def refresh(response: Response, user=Depends(get_authenticated_user)):

    jwt_handler = JWTHandler(subject=user.username)

    token = {
        "access_token": jwt_handler.create_access_token(),
        "refresh_token": jwt_handler.create_refresh_token()
    }

    response.set_cookie(key='app_access', value=token['access_token'], max_age=6000, httponly=False)
    response.set_cookie(key='app_refresh', value=token['refresh_token'], max_age=6000, httponly=False)
    return token


