#!/usr/bin/env python3

import app
import uvicorn
from config import service_configuration


api = app.create_app()

if __name__ == '__main__':
    print("# --- Start Authentication Service --- #")
    
    uvicorn.run(api, 
                host=service_configuration['deployment']['HOST'],
                port=int(service_configuration['deployment']['PORT']),
                root_path=service_configuration['api_settings']['BASE_PATH']
                )
