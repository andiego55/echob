#!/usr/bin/env python3

import os
import shutil
import yaml
import datetime


class FlushEnvFiles:

    service_streams = {'authentication': '../../../services/auth/environment.env',
                       'db': '../../../services/db/environment.env'}

    def __init__(self, environment: str, config: str, services: dict = None):
        self.environment = environment
        if services is None:
            self.services = FlushEnvFiles.service_streams
        self.config = self.load_config(config)

    @staticmethod
    def load_config(path):
        with open(path, 'r') as file:
            configuration = yaml.safe_load(file)
            return configuration

    def flush(self):
        for servicename, path in self.services.items():
            config = self.config['service_configuration'][self.environment][servicename]
            with open(path, "w") as f:

                timestamp = datetime.datetime.now()

                f.write("# --- This file was automatically generated\n")
                f.write("# {}\n".format(timestamp))
                f.write("\n")

                f.write("environment={}\n".format(self.environment))
                for k, v in config.items():
                    if isinstance(v, dict):
                        for k2, v2 in config[k].items():
                            f.write('{}.{}={}'.format(k, k2, v2))
                            f.write("\n")
                    else:
                        f.write('{}={}'.format(k, v))
                        f.write("\n")


if __name__ == '__main__':
    flush_env = FlushEnvFiles(environment='local', config='../../../config.yml')
    flush_env.flush()

