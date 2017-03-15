[![Build Status](https://travis-ci.org/interlock/promise-interactor.svg?branch=master)](https://travis-ci.org/interlock/promise-interactor)
[![Dependency Status](https://david-dm.org/interlock/promise-interactor.svg)](https://david-dm.org/interlock/promise-interactor.svg)

# Interactors

## Single Pattern

```js
class AuthenticateUser {
  call() {
    User.find({email: context.email}).then((user) => {
      if (user.password === context.password) {
        this.context.user = user;
        this.success();
      } else {
        this.fail(new Error("Invalid password"));
      }
    }).error( (err) => {
      this.fail(err);
    });
  }
}

module.exports = InteractorCreate(AuthenticateUser);
```

Calling the interactor

```js
(new AuthenticateUser({email, password})).call().then((context, interactor) {
  console.log(`User logged in: ${context.user});
});

```

## Organization Pattern
