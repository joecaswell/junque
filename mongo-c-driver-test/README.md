Help simplify setting up and testing things with the mongo-c-driver.

Assumes you have already have the `m` tool for managing MongoDB versions, along with gcc and the necessary dependencies for building.

To generate the sample C code, run:
```
make test.c
```

To execute test.c with a particular version of the driver and MongoDB, specify the versions as options:
```
make DRIVERVERSION=1.16.2 MONGOVERSION=4.0.27 test
```

