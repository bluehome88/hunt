# v0.4.14
Updated dependencies to more recent ones

# v0.4.13
Updated dependencies to more recent ones

# v0.4.12
Fix typo with in default user's model and default user's model behaviour.
Flash message for logging out. Pretty print json on development environment.

# v0.4.11
Fix issue with `Hunt.extendTelnet` not returning `Hunt` instance
Improvements in code of example.
Updated dependencies to more recent ones. 
Fix rare race conditions in `Hunt.preload` middleware.
Improvements in documentation and tutorials.

# v0.4.9
[https://www.npmjs.com/package/validator](Validator) is exported as `hunt.validator`.

# v0.4.8
Updated dependencies to more recent ones

# v0.4.7
We can configure socket.io by via config object with this parameters all of this parameters
[https://github.com/Automattic/engine.io#methods-1](https://github.com/Automattic/engine.io#methods-1)

# v0.4.6
Updated dependencies to more recent ones

# v0.4.5
Fix rare issue with malformed user profiles in session storage.
User#email setter converts the email to lower case in all places where it is used. (Sorry for Cyrillic domains)
Break socket.io connection in Mozilla browser like described here 
[https://bugzilla.mozilla.org/show_bug.cgi?id=712329](ttps://bugzilla.mozilla.org/show_bug.cgi?id=712329)
Fix rare bug in local strategy for reseting password with malformed users account

# v0.4.4
User#notifyByEmail now have the user profile in the context of email message template.
Fix rare issue with reseting password with missing `keychain.welcomeLink`

# v0.4.3
Fix issues for sending emails with undefined callback

# v0.4.2
Fix for clearing temporary files resulted from processing uploaded files via `Hunt.multipart` middleware 

# v0.4.1
Feature - we can use hunt.emit('broadcast', message) to emit socket.io messages with different payload,
defined in `message.type`. The backward compatibility with 3.x.x branch exists.
Minor updates in dependencies

# v0.4.0
We use the Mongoose 4.x branch now. The CHANGELOG.md is created.