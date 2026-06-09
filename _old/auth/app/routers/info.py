#!/usr/bin/env python3

from fastapi import APIRouter
from config import service_configuration

router = APIRouter()


@router.get("/info")
def info():
    return {
        "app_name": service_configuration['api_settings']['APP_NAME'],
        "admin_email": service_configuration['api_settings']['ADMIN_EMAIL'],
        "items_per_user": service_configuration['api_settings']['ITEMS_PER_USER']
    }
