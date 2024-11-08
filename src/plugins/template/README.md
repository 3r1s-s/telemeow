# TeleMeow Plugins & What Things Do

## How to add your plugin

Copy the template folder (or just create your own) and name it to whatever your plugin is called (``camelCase`` or something, and keep it unique!)

Make sure it has a manifest!!

And in ``plugins.js`` add your plugin to the consts ``plugins``

```
const plugins = [
    'plugin1',
    'plugin2',
];
```

## Modals and Alerts

```
// Open a modal with a title and a body
openModal({
  title: 'Hello World',
  body: '<span>This is sample HTML</span>'
});

// Open a modal with a title, body, and custom style
openModal({
  title: 'Hello World',
  body: '<span>This is also sample HTML</span>',
  style: 'background-color: #f2f2f2; padding: 20px;'
});
```

```
// Open an alert with a title and a message
openAlert({
  title: 'Bonjour',
  message: ':3'
});

// Open an alert with a title, message, and buttons
openAlert({
  title: 'Hi!',
  message: 'Hello!',
  buttons: [
    {
      text: 'OK',
      action: 'closeAlert()'
    },
    {
      text: 'Cancel',
      action: 'closeAlert()'
    }
  ]
});
```

## (Local)Storage

```
// Set a value in storage
storage.set('example', 'Oh hi!');

// Get a value from storage
const username = storage.get('example');

// Delete a value from storage
storage.delete('example');

// Clear all storage (probably shouldn't touch this)
storage.clear();
```

## Settings
```
// Get a setting value
settings.get('exampleSetting');

// Set a setting value
settings.set('exampleSetting', 'true');
```

## Titlebar
```
// Sets the title of the titlebar
titlebar.set('Title');

// Sets what the back button goes to
titlebar.back('chatsPage()');

// Show the titlebar
titlebar.show();

// Hide the titlebar
titlebar.hide();

// Makes the titlebar fully transparent or not
titlebar.clear(true/false);
```

## Sanitization
```
// Sanitize a piece of user input to prevent XSS attacks
const sanitizedInput = `<script>alert("XSS")</script>`.sanitize();
```

# Example Page
```
function examplePage() {
    page = `example`; // Try to use a name that isn't used already.

    titlebar.set(`Example`);
    titlebar.clear(false);
    titlebar.show();

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="example"> 
            <span>Hi :3</span>
        </div>
    `;
}
```