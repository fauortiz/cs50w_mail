
document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#compose').addEventListener('click', compose_email);
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));

  // Send email upon submitting compose-form
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});



function compose_email() {

  // Show compose view and hide other views
  display_view('#compose-view');

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // hide and clear out compose-notif
  document.querySelector('#compose-notif').style.display = 'none';
  document.querySelector('#compose-notif').innerHTML = '';
}



function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  display_view('#emails-view');
  
  // fetch the mailbox emails, then display a div for each email
  fetch(`emails/${mailbox}`)
  .then(response => response.json())
  // the response is an array of email objects
  .then(emails => {
    
    // if emails is not an array (meaning it's unsuccessful)...
    // TODO maybe i should just verify the 'mailbox' argument as a non-numeric string before fetching...
    if (!Array.isArray(emails)) {
      show_error('Invalid mailbox.');
      return;
    }

    // Show the mailbox name (and clear the innerHTML)
    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
    
    // for each email object in the emails array...
    for (let i = 0; i < emails.length; i++) {
      // create a div for it...
      let div = document.createElement('div');
      
      // give it classes for style...
      div.classList.add('mailbox-email');
      if (emails[i].read) {
        div.classList.add('read');
      }

      // fill in its body...
      let body = '';
      body += emails[i].subject + ' - ';
      body += emails[i].sender + ' - ';
      body += emails[i].timestamp;
      div.innerHTML = body;

      // have it link you to the email proper on click...
      div.addEventListener('click', function() {
        load_email(emails[i].id, mailbox);
      });
      
      // then append this div to emails-view 
      document.querySelector('#emails-view').append(div);
    }

  })
  .catch(error => {
    console.log('load_mailbox Error: ', error);
  });



  function load_email(id, mailbox) {

    // Hide all views (show email later)
    display_view();

    // fetch the email via its ID
    fetch(`emails/${id}`)
    .then(response => response.json())
    .then(email => {

      // if it's a non-array non-error object, we good
      // TODO maybe i should just verify the 'id' argument as a number before fetching...
      // but i don't have to? since it's a nested function?
      if (!(typeof email === 'object' && !Array.isArray(email) && !email.error)) {
        show_error('Email not found.');
        return;
      }

      // populate the DOM with the content specific to this email
      document.querySelector('#email-from').innerHTML = email.sender;
      document.querySelector('#email-to').innerHTML = email.recipients;
      document.querySelector('#email-subject').innerHTML = email.subject;
      document.querySelector('#email-timestamp').innerHTML = email.timestamp;
      document.querySelector('#email-body').innerHTML = email.body;
      load_email_buttons(email);

      // Mark as read (via PUT request)
      if (!email.read) {
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({read: true})
        });
      }
      
      // NOW show email (to avoid flickering(?))
      // TODO check if there a better way to avoid the flickering
      display_view('#email-view');

      function load_email_buttons(email) {
        // clear out any existing buttons
        let email_buttons = document.querySelector('#email-buttons');
        email_buttons.innerHTML = '';

        // create, activate, & append Reply Button
        let reply_button = document.createElement('button');
        reply_button.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'email-button');
        reply_button.innerHTML = 'Reply';
        reply_button.addEventListener('click', () => reply_email(email));
        email_buttons.append(reply_button);

        // create, activate, & append Archive Button
        if (mailbox === 'inbox' || mailbox === 'archive') {

          // create archive_button element
          let archive_button = document.createElement('button');
          archive_button.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'email-button');
          if (email.archived) {
            archive_button.innerHTML = 'Unarchive';
          } else {
            archive_button.innerHTML = 'Archive';
          }

          // toggle archive/unarchive email on archive_button click (via PUT request)
          archive_button.addEventListener('click', () => {
            fetch(`/emails/${email.id}`, {
              method: 'PUT',
              body: JSON.stringify({archived: !email.archived})
            })
            .then(() => load_mailbox('inbox'));
          });

          // append the archive button onto the view
          email_buttons.append(archive_button);
        }
      }        

      function reply_email(email) {
        // load the default compose view
        compose_email();
        document.querySelector('#compose-recipients').value = email.sender;
        document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\n`;
        if (email['subject'].slice(0,4) !== "Re: ") {
          document.querySelector('#compose-subject').value = "Re: " + email.subject;
        } else {
          document.querySelector('#compose-subject').value = email.subject;
        }
      }
   
    }).catch(error => {
      console.log('load_email Error: ', error);
    });
  }
}



function send_email(event) {

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      // in this case, 'recipients' is just one string with comma-separated recipient emails
      recipients: document.querySelector('#compose-recipients').value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    })
    // body looks like this {"recipients":"","subject":"","body":""}
  })
  // .json() method turns json string into a JS object 
  .then(response => response.json())
  .then(result => {

    // result is a JS object which may contain an error key indicating an error
    if (result.error) {
      // if there are errors, show the error message to the user
      document.querySelector('#compose-notif').innerHTML = result.error;
      document.querySelector('#compose-notif').style.display = 'block';
    } else {
      // else, ya gud, load 'sent' mailbox
      load_mailbox('sent');
    }

  })
  // for when the API call (?) fails
  .catch(error => {
    console.log('send_email Error: ', error);
  });
  
  // prevents regular form submission, thereby not reloading the page
  event.preventDefault();
  return false;
}



function show_error(message) {
  document.querySelector('#error-view').innerHTML = message;
  display_view('#error-view');
}



function display_view(view=null) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#error-view').style.display = 'none';
  if (view) {
    try {
      document.querySelector(view).style.display= 'block';

      // TODO the history & url code!!!!

    } catch(error) {
      console.log(error);
    }
  }
}