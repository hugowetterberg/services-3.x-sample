Protecting a resource with OAuth
================================

In this post we will set up an endpoint that uses services_oauth for access control and write a simple client that can consume the service.

Agenda
------

* Getting the necessary modules
* Configuring OAuth
* Creating an endpoint
* Writing a simple Drupal client

Getting the necessary modules
-----------------------------

Just as in the previous article we'll need to download some modules first, and just as before there are two options: either you download the zipball or clone the repos.

### OAuth Common ###

[OAuth common](http://drupal.org/project/oauth_common) is a module independent of services that provides support for modules implementing both OAuth consumers and providers. The 2.x branch is also available at Drupal.org, but as services 3.x is in active development it is probably wiser to do a clone of the repository.

* `git clone --branch 6.x-2.x git://github.com/hugowetterberg/oauth_common.git`
* or [download the zipball](http://github.com/hugowetterberg/oauth_common/zipball/6.x-2.x)

### Services OAuth ###

[Services OAuth](http://drupal.org/project/services_oauth) provides the necessary glue between services and OAuth common.

* `git clone --branch 6.x-2.x git://github.com/hugowetterberg/services_oauth.git`
* or [download the zipball](http://github.com/hugowetterberg/services_oauth/zipball/6.x-2.x)

Configuring OAuth
-----------------

Go to `admin/settings/oauth` add select the "Add context option". Now we're going to configure a context with two authorization levels: read and write. You can call the context whatever you'd like, but I'll call mine "note_api" and give it the title "Note API". 

### Signature methods ###

You can safely ignore the signature methods for now, as we're only going to use SHA1 for signing. But if you'd like to allow stuff like md5 or crc32 signing for your API, this is the place to do it.

### Authorization options ###

The authorization options can be used to customize the authorization page to make it less generic and more user-friendly. The following placeholders can be used in all fields:

* @appname The name of the consumer that is being authorized.
* @user The name of the user.
* @sitename The name of the site.

We're going to leave these fields as they are. But you can always go back and customize texts later if you want to.

### Authorization levels ###

