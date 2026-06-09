from setuptools import setup, find_packages

setup(
    name='python_shared',
    version='0.1',
    packages=find_packages(),
    url=None,
    author='Andreas Wygrabek',
    author_email='andreas.wygrabek@da-sc-ar.de',
    description='Shared python library across services',
    install_requires=[
        'validators'
    ],
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.6',
)
