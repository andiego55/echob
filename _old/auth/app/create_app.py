#!/usr/bin/env python3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import service_configuration
from app.routers import *
from db.database import PushSchema, DBSessionHandler
from db.db_reflection import AuthBase


def create_app():
    """
    Create the application instance
    """

    app = FastAPI(
        title="Authentication API",
        servers=[{"url": service_configuration['api_settings']['BASE_PATH']}],
        root_path=service_configuration['api_settings']['BASE_PATH'],
    )

    origins = [
        "http://127.0.0.1",
        "https://127.0.0.1",
        "http://127.0.0.1:8001",
        "https://127.0.0.1:8001",
        "http://127.0.0.1:8002",
        "https://127.0.0.1:8002",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://localhost",
        "http://localhost:3000",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        max_age=3600,
    )

    @app.get(service_configuration['api_settings']['BASE_PATH'])
    def welcome_message():
        return 'Welcome to Authentication-API - read more in auth/docs'

    app.include_router(info_router,
                       prefix=service_configuration['api_settings']['URL_PREFIX_ENDPOINTS'],
                       tags=['Info'])
    app.include_router(login_router,
                       prefix=service_configuration['api_settings']['URL_PREFIX_ENDPOINTS'],
                       tags=['Login'])
    app.include_router(user_router,
                       prefix=service_configuration['api_settings']['URL_PREFIX_ENDPOINTS'],
                       tags=['User-Information'])
    app.include_router(authentication_router,
                       prefix=service_configuration['api_settings']['URL_PREFIX_ENDPOINTS'],
                       tags=['Authentication'])
    app.include_router(authentication_router_2fa,
                       prefix=service_configuration['api_settings']['URL_PREFIX_ENDPOINTS'],
                       tags=['2-Factor Authentication'])

    # Flush database
    session_handler = DBSessionHandler(connection_string=service_configuration['database']['DSA_CONNECTION_STRING'],
                                       session_on_init=False)

    PushSchema(engine=session_handler.engine,
               dec_base=AuthBase)

    return app
