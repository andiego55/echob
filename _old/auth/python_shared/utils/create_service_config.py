import os


class ServiceConfig:
    def __init__(self, file: str = "../../../services/auth/environment.env"):
        self.file = file
        with open(self.file, 'r') as file:
            for line in file:
                if line.count("=") == 0:
                    continue
                else:
                    line_strip = line.rstrip('\n')
                    splitted_line = line_strip.split("=")
                    if splitted_line[0].count(".") != 0:
                        dict_name = splitted_line[0].split(".")
                        if not hasattr(self, dict_name[0]):
                            setattr(self, dict_name[0], {})
                        getattr(self, dict_name[0])[dict_name[1]] = os.environ.get(splitted_line[0]) or splitted_line[1]
                        continue
                    if not hasattr(self, splitted_line[0]):
                        setattr(self, splitted_line[0], os.environ.get(splitted_line[0]) or splitted_line[1])

    def __getitem__(self, item):
        return getattr(self, item)

if __name__ == "__main__":
    service_config = ServiceConfig("../../services/auth/environment.env")
    #service_config = ServiceConfig("../../services/db/environment.env")
    service_config['database']
