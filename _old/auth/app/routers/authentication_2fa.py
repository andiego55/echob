#!/usr/bin/env python3

from fastapi import APIRouter
from db.db_reflection import *
from fastapi import status, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from authentication.pw_handler import PWHandler
from authentication.jwt_handler import JWTHandler
from authentication.authenticate import get_authenticated_user, get_authorization_header
from datetime import datetime, timedelta
from fastapi import Depends
from app.schemas.schemas import TokenSchema, SignupSchema, UserSchema, Complete2FASchema, SignupResponseSchema
from db.db_reflection import User
from db.database import DBSessionHandler
from sqlalchemy.exc import SQLAlchemyError, NoResultFound
from config import service_configuration
from python_shared.utils.digit_key import generate_key
from python_shared.mail.mail import MailService
from fastapi.responses import Response

router = APIRouter()


# @router.get('/authorization_2fa')
# def show_authorization_header_2f(authorization=Depends(get_authorization_header)):
#     return authorization
#
#
# @router.get('/current_user_2fa', response_model=UserSchema)
# def current_user_2fa(authorized_user=Depends(get_authenticated_user)):
#     try:
#         return UserSchema(**{'username': authorized_user.username,
#                              'password': authorized_user.password,
#                              'salt': authorized_user.salt,
#                              'email': authorized_user.email,
#                              'role': authorized_user.role,
#                              'created_at': authorized_user.created_at})
#     except NoResultFound:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Could not find user",
#         )
#     except SQLAlchemyError as error:
#         print(str(error))
#         session_handler.session.rollback()


@router.post('/signup_2fa', summary="Create new user", response_model=SignupResponseSchema)
async def create_user_2fa(user: SignupSchema):
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

    # Generate Key
    key = generate_key()

    # Instantiate the mail service
    mail_service = MailService(host="wp13348647.mailout.server-he.de",
                               port=587,
                               username="wp13348647-info",
                               password="ungarn01")

    # Compose and send the email
    sender = "info@data-science-architect.de"
    recipients = [user.email]
    subject = "Geoapp: 2 Factor-Authentication"

    expiration_time = datetime.now() + \
                timedelta(minutes=int(service_configuration['authentication_settings']['TWO_FA_EXPIRATION_MINUTES']))
    expiration = expiration_time.strftime('%Y-%m-%d %H:%M:%S')

    body = "<strong>Please take the 6 digit number to complete 2-factor authentication:</strong><br>"
    body += ""
    body += "Your Code will expire at: "+expiration+'<br>'
    body += "Code: "+key+'<br>'
    body += ""+'<br>'
    body += "<a href='{}/signup/verification/{}'>Go to login!</a><br>".format(service_configuration['commons']['LOGIN_BASE_PATH'], user.username)

    mail_service.send_mail(sender=sender, recipients=recipients, subject=subject, body=body, attachments=None)

    # Password management and user creation
    pwt_handler = PWHandler(password=user.password)
    jwt_handler = JWTHandler(subject=user.username)

    new_user = User(username=user.username,
                    password=pwt_handler.password_hashed_decoded,
                    salt=pwt_handler.salt_decoded,
                    email=user.email,
                    private_key=jwt_handler.keys['private_key'],
                    public_key=jwt_handler.keys['public_key'],
                    role='user',
                    auth_2f=True,
                    digit_code_2fa=int(key.replace(' ', '')),
                    digit_code_expiration=expiration_time,
                    auth_2f_completed=False,
                    created_at=datetime.now())

    try:
        session_handler.session.add(new_user)
        session_handler.session.commit()
        msg = "Successfully imported user to db - waiting for 2 factor confirmation"
    except SQLAlchemyError as error:
        print(str(error))
        session_handler.session.rollback()
        msg = "Could not import user to db"

    return {'username': user.username,
            'message': msg}


@router.post('/complete_2fa', summary="Complete 2FA", response_model=SignupResponseSchema)
async def complete_2fa(response: Response, credentials: Complete2FASchema):
    session_handler = DBSessionHandler(session_on_init=True)
    query = session_handler.session.query(User).filter(User.username == credentials.username)

    out = []
    for user in query:
        out.append(user)

    # Check digit key
    if user.digit_code_2fa != int(credentials.digit_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Digit key not correct"
        )

    # Check expiration
    now = datetime.now()
    expiration_time = datetime.strptime(user.digit_code_expiration, format('%Y-%m-%d %H:%M:%S.%f'))
    if now > expiration_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code already expired"
        )

    session_handler.session.query(User).filter(User.username == credentials.username).update({User.auth_2f_completed: True},
                                                                                              synchronize_session=False)
    session_handler.session.commit()

    jwt_handler = JWTHandler(subject=user.username)
    token = {
        "access_token": jwt_handler.create_access_token(),
        "refresh_token": jwt_handler.create_refresh_token()
    }
    response.set_cookie(key='app_access', value=token['access_token'], max_age=60, httponly=False)
    response.set_cookie(key='app_refresh', value=token['refresh_token'], max_age=60, httponly=False)
    return {'username': credentials.username,
            'message': 'Successfully completed 2FA'}


# @router.post('/login_2fa', summary="Create access and refresh tokens for user")
# async def login_2fa(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
#
#     try:
#         session_handler = DBSessionHandler(session_on_init=True)
#         user = session_handler.session.query(User).filter(User.username == form_data.username).one()
#     except NoResultFound:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="No row was found when one was required",
#         )
#
#     if user is None:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Incorrect username or password"
#         )
#
#     if user.auth_2f:
#         if not user.auth_2f_completed:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="2-FA not completed"
#             )
#
#     if not PWHandler.password_compare(form_data.password, user.password):
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Incorrect email or password"
#         )
#
#     jwt_handler = JWTHandler(subject=user.username)
#     token = {
#         "access_token": jwt_handler.create_access_token(),
#         "refresh_token": jwt_handler.create_refresh_token()
#     }
#     response.set_cookie(key='app_cookie', value=token['access_token'], max_age=60, httponly=False)
#     return {'Cookie': 'Was sent'}
