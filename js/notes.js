// $Id$

(function ($) {
  var noteapi = {
    'apiPath': '/js-api/note'
  };

  // REST functions.
  noteapi.create = function (note, callback) {
    $.ajax({
      type: "POST",
      url: this.apiPath,
      data: JSON.stringify(note),
      dataType: 'json',
      contentType: 'application/json',
      success: callback
    });
  };

  noteapi.retreive = function (id, callback) {
    $.ajax({
      type: "GET",
      url: this.apiPath + '/' + id,
      dataType: 'json',
      success: callback
    });
  };

  noteapi.update = function (note, callback) {
    $.ajax({
      type: "PUT",
      url: this.apiPath + '/' + note.id,
      data: JSON.stringify(note),
      dataType: 'json',
      contentType: 'application/json',
      success: callback
    });
  };

  noteapi.del = function (id, callback) {
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

  // Drupal.note.create({
  //   subject: 'Note',
  //   note: 'A test note',
  // }, function(r) {console.log(r)});

  $(document).ready(function () {
    var subject, text, list, note, note_saved, note_append;

    $('<div id="notetaking"><form>' +
        '<div class="subject-wrapper"><label for="note-subject">Subject</label></div>' +
        '<div class="note-wrapper"></div>' + 
        '<input class="cancel" type="submit" value="Cancel" />' +
        '<input class="save" type="submit" value="Save" />' +
      '</form></div>').appendTo('body');
    subject = $('<input class="subject" type="text" />').appendTo('#notetaking .subject-wrapper');
    text = $('<textarea class="note" cols="20" rows="5" />').appendTo('#notetaking .note-wrapper');
    list = $('<ul></ul>').appendTo('#notetaking');

    // Stop the form from submitting
    $('#notetaking form').submit(function () {
      return false;
    });

    $('#notetaking input.cancel').hide().click(function () {
      note = null;
      $(this).hide();
      $(subject).val('');
      $(text).val('');
    });

    $('#notetaking input.save').click(function () {
      var data;
      $(this).hide();
      $('#notetaking input.cancel').hide();

      data = {
        subject: $(subject).val(),
        note: $(text).val()
      };

      if (note) {
        data.id = note.id;
        note = null;
        noteapi.update(data, note_saved);
      }
      else {
        noteapi.create(data, note_saved);
      }
      note = null;
    });

    note_saved = function (res) {
      note = null;
      $(subject).val('');
      $(text).val('');
      $('#notetaking input.save').show();

      noteapi.retreive(res.id, function (res) {
        note_append(res);
      });
    };

    note_append = function (noteData, bottom) {
      var noteNode;

      $('#note-' + noteData.id).remove();
      noteNode = $('<li class="note">' +
        '<strong class="subject"></strong> ' +
        '<span class="text"></span>' +
        '<ul>' +
          '<li><a class="delete">Delete</a></li>' +
          '<li><a class="edit">Edit</a></li>' +
        '</ul>' +
      '</li>');
      noteNode.attr('id', 'note-' + noteData.id);

      if (bottom) {
        noteNode.appendTo(list);
      }
      else {
        noteNode.prependTo(list);
      }

      $('.subject', noteNode).text(noteData.subject);
      $('.text', noteNode).text(noteData.note);
      $('.delete', noteNode).click(function () {
        noteapi.del(noteData.id, function () {
          $(noteNode).remove();
        });
      });
      $('.edit', noteNode).click(function () {
        note = noteData;
        subject.val(noteData.subject);
        text.val(noteData.note);
        $('#notetaking input.cancel').show();
      });
    };

    noteapi.index(function (res) {
      var i, length;
      for (i = 0, length = res.length; i < length; i++) {
        note_append(res[i], true);
      }
    });
  });
}(jQuery));