# OVH-API-Console

A simple version of the OVH Api Console.

Note: The environnement is based on the [ngBoilerplate](https://github.com/ngbp/ngbp) engine.

## Installation

Before cloning the project, make sure to have: git, node.js, grunt-cli, and bower.
For this 2 last elements, once you have node.js installed, simply run:
`npm install -g bower` and ` npm install -g grunt-cli` 

You can now install dependancies:
```shell
npm install
bower install
```

And finally add your API AK, AS, and Base Path into `src/app/app.js`:
```
OvhProvider.setAppKey('INSERT_AK_HERE');

OvhProvider.setAppSecret('INSERT_AS_HERE');

OvhProvider.setBaseUrl('INSERT_URL_HERE');

```

## Development

Simply launch: `grunt watch`.

Builded development files are generated into the `build` folder.
You can expose this folder with Apache or Nginx, but you can also simply launch `grunt serve`!

## Compil / Release

Just execute: `grunt`. It will create a `dist` folder with all production files.
Then, copy all the files in this folder to your production server!

# Contributing

Please send me pull requests!