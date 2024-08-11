Make sure that the pull request meets DoD criteria:

_Documentation_

- [ ] Changes that makes documentation outdated are described in `README.md`

_Maintainability_

- [ ] Reasonable amount of logging has been added (`Debug` level)
- [ ] All errors are logged with `Error` level
- [ ] Validation errors are logged with `Warning` level

_Testing_

- [ ] Plugin does not crash when configuration is not provided (default state)
- [ ] New functionality is dev tested in `Homebridge`
- [ ] Errors that are produced by plugin do not crash `Homebridge`
