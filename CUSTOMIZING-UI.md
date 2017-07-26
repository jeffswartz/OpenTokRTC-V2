# Customizing OpenTokRTC UI

You can customize UI colors and logos of OpenTokRTC. Follow this guide to know where to edit them.

## Changing theme colors

OpenTokRTC uses the LESS CSS pre-processor for its CSS. Values for theme colors are in the file [`web/less/variables.less`](web/less/variables.less). Edit this values in this file to suit your needs.

Once you have edited this file, you will need to build new UI assets. Run:

```
$ grunt clientBuild
```

## Adding static assets

The `web/` directory in the project root is mounted as a static path in the application root. Any files or directories in this directory will be accessible in the browser relative to the application root (`/`).

You can put your images in the `web/images` directory. They can be accessed in the application as `/images/`. For example, the file `web/images/opentok-logo.png` can be accessed in the browser as `/images/opentok-logo.png`.

Add ejs partials files to a subdirectory of the the views/partials directory. The ejs files in
the root of the views directory include the contents of these files in the user interface.

## Config settings for overriding the default user interface

The app uses EJS partials for some data. The default partials are located in the
views/partials/default/ directory. You can write your own partials to override the default
user interface.

In the config/config.json file, add the following property to the top level of the JSON:

```json
  "partialsPath": "my-partials-subdir-name"
```

Set this property to the name of the subdirectory of the views/partials/ directory that contains
your custom EJS partials. Do not add the trailing slash -- just set the subdirectory name.

You can also set this as an environment variable named `PARTIALS_PATH`.

For example, the views/partials/opentokrtc.com directory contains EJS partials defining the user
interface used by the opentokrtc.com site. (To use this directory, you would set `partialsPath` to
`"opentokrtc.com"`.)

If a custom EJS partial is not set, the app uses the default UI.

The app includes the following EJS partials

| EJS partial file | Description |
| ---------------- | ----------- |
| index.confirmation.ejs  | Contains the HTML for the confirmation dialog box in the index (home) view. If you do not include this partial file, no confirmation dialog box is displayed. |
| index.header.ejs  | The heading text to include in the index (home) page | 
| room.menu.ejs | Custom menu items to add to the left-hand menu of the room page. |
| endCall.header.ejs | Content to add to the top of the end call page. |
| endCall.showTbLinks.ejs`  | `END_CALL_SHOW_TB_LINKS`  | Whether to simply display links to TokBox info ("Build a WebRTC app and "Learn about TokBox") in the end call page. The default is `false`, and the end call page displays other info, including a list of archives (if there are any) for the call. |

You can also specify a custom CSS file for the room view. In the config/config.json file, specify
the path to the custom CSS file (as a subdirectory of the web/css directory). You can also set this
as an environment variable named `ROOM_CSS`. If you do not set this, the room page uses the default
css/room.opentok.css file.

The following is an example of a config/config.json file that sets each of these user interface options:

```json
{
    "OpenTok": {
        "apiKey": "12345",
        "apiSecret": "58ade1b63e6a883bf"
    },
    "partials": "mysite",
    "roomCSS": "/css/webrtc.opentok.css"
}
```

## Changing landing page HTML

Edit the view file [`views/index.ejs`](views/index.ejs) and change the images and text in the `<body>` section. You can also change the text in the `<title>` tag.
