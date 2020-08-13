# 2.2.3

* Handle exceptions throw from the wrap/unwrap functions with interactionWrapper

# 2.2.2

* Added interactionWrapper to allow calling interactors across context boundries
* Removed dist folder from git
* Added a generic constructor descriptor for Interactor

# 2.2.1

* Cleaned out old Organizer code and made the organizers method abstract

# 2.2.0

* Added context type to the static exec on Interactor

# 2.1.0

* Support for generics on Interactor and Organizer

# 2.0.0

## Breaking Changes

* before/after/rollback must always return a promise
* States for Interactor are now an enum exported

## Features

* rewriten in TypeScript
* moved from eslint to tslint
