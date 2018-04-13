[![Build Status](https://travis-ci.org/interlock/promise-interactor.svg?branch=master)](https://travis-ci.org/interlock/promise-interactor)
[![Dependency Status](https://david-dm.org/interlock/promise-interactor.svg)](https://david-dm.org/interlock/promise-interactor)
[![Dev Dependency Status](https://david-dm.org/interlock/promise-interactor/dev-status.svg)](https://david-dm.org/interlock/promise-interactor/dev-status)
[![Greenkeeper badge](https://badges.greenkeeper.io/interlock/promise-interactor.svg)](https://greenkeeper.io/)
[![Package Quality](http://npm.packagequality.com/shield/promise-interactor.svg)](http://packagequality.com/#?package=promise-interactor)

# Interactors

Based on the popular ruby gem [Interactor](https://github.com/collectiveidea/interactor). Uses chainable promises to allow
flow of completing multiple interactors.


## Single Pattern

```js
import PromiseInteractor from 'promise-interactor';

const { Interactor } = PromiseInteractor;

class AuthenticateUser extends Interactor {

  // optional before, if it returns a promise it is inserted in the promise chain
  before() {
    return Promise.resolve(true);
  }

  call() {
    const { password, email } = this.context;
    User.find({email: email}).then((user) => {
      if (user.password === password) {
        this.context.user = user;
        this.resolve();
      } else {
        this.reject(new Error("Invalid password"));
      }
    }).error( (err) => {
      this.reject(err);
    });
  }

  // optional after, if it returns a promise it is inserted in the promise chain
  // just before we resolve the root promise
  after() {
    return Promise.resolve(true);
  }
}

module.exports = AuthenticateUser;
```

Calling the interactor

```js
(new AuthenticateUser({email, password}))
  .exec()
  .then((interactor) => {
    console.log(`User logged in: ${interactor.context.user}`);
  })
  .catch((err) => {
    console.log(`Error: ${error}`);
  });

```

## Rollback

If your interactor rejected, you can optionally provide a rollback which will clean up

```js
class AuthenticateUser extends Interactor{
  // If we returned a promise, it would wait on that before calling the reject
  // otherwise this is considered a sync call and the promise is rejected immediately after
  rollback(err) {
    console.log(err);
  }
}
```

## Organization Pattern

Makes grouping interactors in sequence a little easier.

```js
import PromiseInteractor from 'promise-interactor';

const { Organizer } = PromiseInteractor;

class AuthUserOrganizer extends Organizer {

  organize() {
    return [AuthenticateUser, SomeOtherInteractor];
  }
}

AuthUserOrganizer
  .exec({email, password})
  .then((i) => {
    console.log(i.context);
  });
...
```

`rollback` for Organizer will call `rollback` for previously RESOLVED interactors with the current state. You can override this functionality by implementing your own `rollback` on Organizer.
