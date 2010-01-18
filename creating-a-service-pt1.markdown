Creating a Resource for Services 3.x
=============================================

I've gotten quite a bit of questions about how the new 3.x version of services works. So I thought that I should write a blog post about developing a service, complete with a endpoint and authentication settings.

We'll implement a simple service for notes and that's exposed using the REST Server. Then we'll implement a simple javascript client for note-taking. This post is pretty much written like extended code comments and [the full code and article text is available here](https://github.com/hugowetterberg/services-3.x-sample). Feel free to fork this repo and flesh out the text if you want to.

Agenda
---------------------------------------------

* Getting the necessary modules
* Implementing a note service (resource)
* Creating a endpoint
* Writing a simple JavaScript client

Getting the necessary modules
---------------------------------------------

First off we have to download the necessary modules off github and drupal.org. There are two options for the github modules, either you download the zipball or clone the repos.

### Services

* `git clone --branch endpoints git://github.com/hugowetterberg/services.git`
* or [download zipball](http://github.com/hugowetterberg/services/zipball/endpoints)

### Chaos tools

The only dependency for services. Provides the framework for the endpoint definitions so that they can be exported and defined in both code and the database. Maybe further along the road it'll be used for a plugin system for the servers and authentication mechanisms.

* Download from [the ctools project page at drupal.org](http://drupal.org/project/ctools).

### REST Server

My server implementation of choice and what we'll be using to test our service. The reason for the branch being named contexts was that that was my initial working title for services 3.x. I later realized that the use of such a established term would be confusing and switched to endpoints, I never bothered to rename this branch though.

* git clone --branch contexts git://github.com/hugowetterberg/rest_server.git
* or [download zipball](http://github.com/hugowetterberg/rest_server/zipball/contexts)

### Inputstream

Inputstream is required by the REST Server.

> Provides a stream-wrapper for drupal://input that should be used instead of php://input. This module doesn't do anything in itself, but must be used when the php://input is accessed by two or more independent modules.

* Download from [the inputstream project page at drupal.org](http://drupal.org/project/inputstream).

### Autoload

Autoload is required by the REST Server.

> The autoload module is a utility module. It allows other modules to leverage PHP 5's class autoloading capabilities in a unified fashion.

* Download from [the autoload project page at drupal.org](http://drupal.org/project/autoload).

Implementing a note service (resource)
---------------------------------------------

Create a noteresource module that will contain our service implementation. The info file could look something like this:

    ; $Id$
    name = Note Resource
    description = Sample resource implementation
    package = Notes example

    core = 6.x
    php = 5.2

To get a really simple example I'll create an api for storing notes. In a real world scenario notes would probably be stored as nodes, but to keep things simple we'll create our own table for storing notes.

    <?php
    // noteresource.install
    /**
     * Implementation of hook_install().
     */
    function noteresource_install() {
      drupal_install_schema('noteresource');
    }

    /**
     * Implementation of hook_uninstall().
     */
    function noteresource_uninstall() {
      drupal_install_schema('noteresource');
    }

    /**
     * Implementation of hook_schema().
     */
    function noteresource_schema() {
      return array(
        'note' => array(
          'description' => 'Stores information about notes',
          'fields' => array(
            'id' => array(
              'description' => 'The primary identifier for a note.',
              'type' => 'serial',
              'unsigned' => TRUE,
              'not null' => TRUE,
            ),
            'uid' => array(
              'description' => t('The user that created the note.'),
              'type' => 'int',
              'unsigned' => TRUE,
              'not null' => TRUE,
              'default' => 0,
            ),
            'created' => array(
              'description' => t('The timestamp for when the note was created.'),
              'type' => 'int',
              'unsigned' => TRUE,
              'not null' => TRUE,
              'default' => 0,
            ),
            'modified' => array(
              'description' => t('The timestamp for when the note was modified.'),
              'type' => 'int',
              'unsigned' => TRUE,
              'not null' => TRUE,
              'default' => 0,
            ),
            'subject' => array(
              'description' => t('The subject of the note'),
              'type' => 'varchar',
              'length' => 255,
              'not null' => TRUE,
            ),
            'note' => array(
              'description' => t('The note'),
              'type' => 'text',
              'size' => 'medium',
            ),
          ),
          'primary key' => array('id'),
        ),
      );
    }

### The familiar stuff

Now lets implement some basic hooks and API methods. We need some permissions that'll be used to decide what our users can and cannot do:

    <?php
    // noteresource.module
    /**
     * Implementation of hook_perm().
     */
    function noteresource_perm() {
      return array(
        'note resource create',
        'note resource view any note',
        'note resource view own notes',
        'note resource edit any note',
        'note resource edit own notes',
        'note resource delete any note',
        'note resource delete own notes',
      );
    }

Now for some Drupal API methods for the basic CRUD operations for our notes. These will be used by the functions that are used as callbacks for our resource. But it's always a good idea to supply functions like these so that other Drupal modules have a nice and clean interface to your module's data.

    <?php
    // noteresource.module
    /**
     * Gets a note object by id.
     *
     * @param int $id
     * @return object
     */
    function noteresource_get_note($id) {
      return db_fetch_object(db_query("SELECT * FROM {note} WHERE id=%d", array(
        ':id' => $id,
      )));
    }

    /**
     * Writes a note to the database
     *
     * @param object $note
     * @return void
     */
    function noteresource_write_note($note) {
      $primary_key = !empty($note->id) ? array('id') : NULL;
      drupal_write_record('note', $note, $primary_key);
    }

    /**
     * Deletes a note from the database.
     *
     * @param int $id
     * @return void
     */
    function noteresource_delete_note($id) {
      db_query("DELETE FROM {note} WHERE id=%d", array(
        ':id' => $id,
      ));
    }

### Defining our resource

All resources are defined through hook_services_resources(). The way resources are declared is quite similar to how the template and menu system works, it also bears a very close resemblance to how 2.x services are defined.

Notice how we define the basic CRUD methods here: create, retrieve, update, delete (and index). Most resources implement these methods, but it is also possible to implement actions, targeted actions and relationships. Those won't be covered here but their general nature is explained in the [REST Server README](http://github.com/hugowetterberg/rest_server).

All the methods have `'file' => array('file' => 'inc', 'module' => 'noteresource'),` specified, which tells services that it can find the callback function in the file noteresource.inc, which is where we will write them all.

    <?php
    // noteresource.module
    /**
     * Implementation of hook_services_resources().
     */
    function noteresource_services_resources() {
      return array(
       'note' => array(
         'retrieve' => array(
           'help' => 'Retrieves a note',
           'file' => array('file' => 'inc', 'module' => 'noteresource'),
           'callback' => '_noteresource_retrieve',
           'access callback' => '_noteresource_access',
           'access arguments' => array('view'),
           'access arguments append' => TRUE,
           'args' => array(
             array(
               'name' => 'id',
               'type' => 'int',
               'description' => 'The id of the note to get',
               'source' => array('path' => '0'),
               'optional' => FALSE,
             ),
           ),
         ),
         'create' => array(
           'help' => 'Creates a note',
           'file' => array('file' => 'inc', 'module' => 'noteresource'),
           'callback' => '_noteresource_create',
           'access arguments' => array('note resource create'),
           'access arguments append' => FALSE,
           'args' => array(
             array(
               'name' => 'data',
               'type' => 'struct',
               'description' => 'The note object',
               'source' => 'data',
               'optional' => FALSE,
             ),
           ),
         ),
         'update' => array(
           'help' => 'Updates a note',
           'file' => array('file' => 'inc', 'module' => 'noteresource'),
           'callback' => '_noteresource_update',
           'access callback' => '_noteresource_access',
           'access arguments' => array('update'),
           'access arguments append' => TRUE,
           'args' => array(
             array(
               'name' => 'id',
               'type' => 'int',
               'description' => 'The id of the node to update',
               'source' => array('path' => '0'),
               'optional' => FALSE,
             ),
             array(
               'name' => 'data',
               'type' => 'struct',
               'description' => 'The note data object',
               'source' => 'data',
               'optional' => FALSE,
             ),
           ),
         ),
         'delete' => array(
           'help' => 'Deletes a note',
           'file' => array('file' => 'inc', 'module' => 'noteresource'),
           'callback' => '_noteresource_delete',
           'access callback' => '_noteresource_access',
           'access arguments' => array('delete'),
           'access arguments append' => TRUE,
           'args' => array(
             array(
               'name' => 'nid',
               'type' => 'int',
               'description' => 'The id of the note to delete',
               'source' => array('path' => '0'),
               'optional' => FALSE,
             ),
           ),
         ),
         'index' => array(
           'help' => 'Retrieves a listing of notes',
           'file' => array('file' => 'inc', 'module' => 'noteresource'),
           'callback' => '_noteresource_index',
           'access callback' => 'user_access',
           'access arguments' => array('access content'),
           'access arguments append' => FALSE,
           'args' => array(array(
               'name' => 'page',
               'type' => 'int',
               'description' => '',
               'source' => array(
                 'param' => 'page',
               ),
               'optional' => TRUE,
               'default value' => 0,
             ),
             array(
               'name' => 'parameters',
               'type' => 'array',
               'description' => '',
               'source' => 'param',
               'optional' => TRUE,
               'default value' => array(),
             ),
           ),
         ),
       ),
      );
    }

There is another alternative when defining services (which I personally prefer) but that will probably be covered in a later article. Take a look at http://github.com/hugowetterberg/services_oop if you're curious.

### Implementing the callbacks

Create the file noteresource.inc which is where we told services that it could find our callbacks.

We'll start with the create-callback. The method will receive a object describing the note that is about to be saved. The attributes we want are subject and note and we'll throw an error if those are missing. We return the id of the created note, and it's uri so that the client knows how to access it. A get-request to the uri will return the full note.

    <?php
    // noteresource.inc
    /**
     * Callback for creating note resources.
     *
     * @param object $data
     * @return object
     */
    function _noteresource_create($data) {
      global $user;

      unset($data->id);
      $data->uid = $user->uid;
      $data->created = time();
      $data->modified = time();

      if (!isset($data->subject)) {
        return services_error('Missing note attribute subject', 406);
      }

      if (!isset($data->note)) {
        return services_error('Missing note attribute note', 406);
      }

      noteresource_write_note($data);
      return (object)array(
        'id' => $data->id,
        'uri' => services_resource_uri(array('note', $data->id)),
      );
    }

The update callback works more or less the same, but we don't have to check that subject and note exists, there is no harm in allowing a client to just update the subject and leave the note alone.

    <?php
    // noteresource.inc
    /**
     * Callback for updating note resources.
     *
     * @param int $id
     * @param object $data
     * @return object
     */
    function _noteresource_update($id, $data) {
      global $user;
      $note = noteresource_get_note($id);

      unset($data->created);
      $data->id = $id;
      $data->uid = $note->uid;
      $data->modified = time();

      noteresource_write_note($data);
      return (object)array(
        'id' => $id,
        'uri' => services_resource_uri(array('note', $id)),
      );
    }

The retrieve and delete callbacks are pretty trivial and probably don't need any further explanation.

    <?php
    // noteresource.inc
    /**
     * Callback for retrieving note resources.
     *
     * @param int $id
     * @return object
     */
    function _noteresource_retrieve($id) {
      return noteresource_get_note($id);
    }

    /**
     * Callback for deleting note resources.
     *
     * @param int $id
     * @return object
     */
    function _noteresource_delete($id) {
      noteresource_delete_note($id);
      return (object)array(
        'id' => $id,
      );
    }

The index callback fetches a users notes and returns them all. We specified some arguments for this method that we don't use. They are mostly here to show that it would be a good idea to support paging and filtering of a index listing.

    <?php
    // noteresource.inc
    /**
     * Callback for listing notes.
     *
     * @param int $page
     * @param array $parameters
     * @return array
     */
    function _noteresource_index($page, $parameters) {
      global $user;

      $notes = array();
      $res = db_query("SELECT * FROM {note} WHERE uid=%d ORDER BY modified DESC", array(
        ':uid' => $user->uid,
      ));

      while ($note = db_fetch_object($res)) {
        $notes[] = $note;
      }

      return $notes;
    }

### Access checking

Last but not least, we specified a access callback for all methods. This checks so that users don't oversteps their bounds and starts looking at other people's notes without having the proper permissions. This function should be in the main .module file.

    <?php
    // noteresource.module
    /**
     * Access callback for the note resource.
     *
     * @param string $op
     *  The operation that's going to be performed.
     * @param array $args
     *  The arguments that will be passed to the callback.
     * @return bool
     *  Whether access is given or not.
     */
    function _noteresource_access($op, $args) {
      global $user;
      $access = FALSE;

      switch ($op) {
        case 'view':
          $note = noteresource_get_note($args[0]);
          $access = user_access('note resource view any note');
          $access = $access || $note->uid == $user->uid && user_access('note resource view own notes');
          break;
        case 'update':
          $note = noteresource_get_note($args[0]->id);"
          $access = user_access('note resource edit any note');
          $access = $access || $note->uid == $user->uid && user_access('note resource edit own notes');
          break;
        case 'delete':
          $note = noteresource_get_note($args[0]);
          $access = user_access('note resource delete any note');
          $access = $access || $note->uid == $user->uid && user_access('note resource delete own notes');
          break;
      }

      return $access;
    }

As you can see neither the create nor the index function is represented here. That's because they both use user_access() directly. Unlike the other methods there are no considerations like note ownership to take into account. For creation the permission 'note resource create' is checked and for the index listing only 'access content' is needed.

Creating an endpoint
---------------------------------------------

The endpoint can actually be created in two ways either through the admin interface or through code. The easiest option is most often to create the endpoint through the interface, and then export it and copy paste it into your module.

Go to admin/build/services and click "Add endpoint". Name your endpoint "notes" and call it something nice, like "Note API". Choose "REST" as your server and place the endpoint at "js-api". No authentication modules are installed so just let authentication remain set to "Session".

Save and click edit when you see your newly created endpoint in the list. Click the Resources tab/local task and enable all methods for the note resource. Then save your changes.

You should now have a proper working endpoint that exposes your note API. The easiest way to check that everything's working properly is to add a dummy note to your table. Then try to access it on js-api/note/[id].yaml, where [id] is the id of the note you created (probably 1).

Writing a simple JavaScript client
---------------------------------------------

We'll put our javascript client in a module named noteresourcejs. The info file could look something like this:

    ; $Id$
    name = Notes Javascript
    description = Sample endpoint definition and javascript client implementation
    package = Notes example

    core = 6.x
    php = 5.2

The javascript module will do two things: implement a javascript client; and provide the notes endpoint in code.

### Defining the endpoint in code

Goto admin/build/services and select Export for your Notes API endpoint. The code shown should be copy-pasted in a hook named hook_default_services_endpoint().

  <?php
  // noteresourcejs.module
  /**
   * Implementation of hook_default_services_endpoint().
   */
  function noteresourcejs_default_services_endpoint() {
    $endpoints = array();

    $endpoint = new stdClass;
    $endpoint->disabled = FALSE; /* Edit this to true to make a default endpoint disabled initially */
    $endpoint->endpoint = 'notes';
    $endpoint->title = 'Note API';
    $endpoint->server = 'rest_server';
    $endpoint->path = 'js-api';
    $endpoint->authentication = '';
    $endpoint->authentication_settings = array();
    $endpoint->resources = array(
      'note' => array(
        'alias' => '',
        'operations' => array(
          'create' => array(
            'enabled' => 1,
          ),
          'retrieve' => array(
            'enabled' => 1,
          ),
          'update' => array(
            'enabled' => 1,
          ),
          'delete' => array(
            'enabled' => 1,
          ),
          'index' => array(
            'enabled' => 1,
          ),
        ),
      ),
    );
    $endpoints[] = $endpoint;

    return $endpoints;
  }

Notice that we don't return the endpoint as it is. But, as with views, we return an array containing the endpoint.

### The client

Our client is quite trivial and will consist of one js file and one css file. I'm not going to write them both in their entirety here, but rather provide an excerpt that illustrates how you can communicate with a REST server using JavaScript. See [notes.js](services-3.x-sample/blob/master/js/notes.js) and [notes.css](services-3.x-sample/blob/master/css/notes.css) for the full versions.

    // js/notes.js (excerpt)
    var noteapi = {
      'apiPath': '/js-api/note'
    };

    // REST functions.
    noteapi.create = function(note, callback) {
      $.ajax({
         type: "POST",
         url: this.apiPath,
         data: JSON.stringify(note),
         dataType: 'json',
         contentType: 'application/json',
         success: callback
       });
    };

    noteapi.retreive = function(id, callback) {
      $.ajax({
        type: "GET",
        url: this.apiPath + '/' + id,
        dataType: 'json',
        success: callback
      });
    };

    noteapi.update = function(note, callback) {
      $.ajax({
         type: "PUT",
         url: this.apiPath + '/' + note.id,
         data: JSON.stringify(note),
         dataType: 'json',
         contentType: 'application/json',
         success: callback
       });
    };

    noteapi.del = function(id, callback) {
      $.ajax({
         type: "DELETE",
         url: this.apiPath + '/' + id,
         dataType: 'json',
         success: callback
       });
    };

    noteapi.index = function (callback) {
      $.getJSON(this.apiPath, callback);
    };

Notice how we don't need to do anything odd to talk with our server. Everything maps to http verbs and a url, so there is no need for special client libraries.

The js and css is added in hook_init(), and will therefore be loaded on all pages in our Drupal install.

    <?php
    // noteresourcejs.module
    /**
     * Implementation of hook_init().
     */
    function noteresourcejs_init() {
      drupal_add_css(drupal_get_path('module', 'noteresourcejs') . '/css/notes.css');
      drupal_add_js(drupal_get_path('module', 'noteresourcejs') . '/js/notes.js');
    }