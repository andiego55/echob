#!/usr/bin/env python3

import os
import shutil

if not os.path.exists('python_shared'):
    try:
        print("# COPY python_shared INTO PROJECT")
        source_dir = '../../core/python_shared'
        dest_dir = 'python_shared'
        shutil.copytree(source_dir, dest_dir)
    except:
        print("# python_shared NOT copied into project")

else:
    print("# DIRECTORY python_shared ALREADY IN PROJECT")

from python_shared.utils.create_service_config import ServiceConfig
from python_shared.utils.connection_strings import create_postgres_connection_string

service_configuration = ServiceConfig(file=os.environ.get('env_file') or 'environment.env')

service_configuration['database']['DSA_CONNECTION_STRING'] = \
        create_postgres_connection_string(HOST=service_configuration['database']['DB_HOST'],
                                          DRIVER=service_configuration['database']['DB_DRIVER'],
                                          PORT=service_configuration['database']['DB_PORT'],
                                          DATABASE_NAME=service_configuration['database']['DB_NAME'],
                                          USERNAME=service_configuration['database']['DB_USERNAME'],
                                          PASSWORD=service_configuration['database']['DB_PASSWORD'])

# Set correct types:
service_configuration['authentication_settings']['ACCESS_TOKEN_EXPIRES_MINUTES'] = \
    int(service_configuration['authentication_settings']['ACCESS_TOKEN_EXPIRES_MINUTES'])
service_configuration['authentication_settings']['REFRESH_TOKEN_EXPIRES_MINUTES'] = \
    int(service_configuration['authentication_settings']['REFRESH_TOKEN_EXPIRES_MINUTES'])