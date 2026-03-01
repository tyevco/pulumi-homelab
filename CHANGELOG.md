# Changelog

## [0.3.0](https://github.com/tyevco/pulumi-homelab/compare/v0.2.3...v0.3.0) (2026-03-01)


### ⚠ BREAKING CHANGES

* Remove all dockge backward-compat aliases and rename client module. DockgeStack, DockgeStackArgs, DockgeContainerInfo, DockgeClientConfig, DockgeStackInfo, and configureDockgeClient exports are removed. The dockge:index:DockgeStack resource type is no longer supported. Config keys dockge:config:url and dockge:config:apiKey are removed. Use homelab:config:url and homelab:config:apiKey instead.

### Features

* add LXC container resource ([2cdb2f4](https://github.com/tyevco/pulumi-homelab/commit/2cdb2f495c9ae9b72bd1afd4cde3acefeb8eb71a))
* add mac as supported alias type for OpnsenseAlias ([7e87616](https://github.com/tyevco/pulumi-homelab/commit/7e87616958bb6f385d3c2c584499ddeff3af66a9))
* add mac as supported alias type for OpnsenseAlias ([2ebbbde](https://github.com/tyevco/pulumi-homelab/commit/2ebbbde093eb9e1d81dddc7b8c64f679a85546ea))
* remove dockge backward compatibility and rename to homelab ([1b2c921](https://github.com/tyevco/pulumi-homelab/commit/1b2c921261742350d799470678e871be0122f9c4))


### Bug Fixes

* add docker-compose keyword to schema ([da87af7](https://github.com/tyevco/pulumi-homelab/commit/da87af7bc4338baa8056688a49d2e58eb4da8d78))
* add json.message support to homelabClient error extraction ([2a1b58c](https://github.com/tyevco/pulumi-homelab/commit/2a1b58c42c793a46c2ac0ffc0bd5b1e1f049d0b4))
* code analysis bug fixes and edge case tests ([5731b29](https://github.com/tyevco/pulumi-homelab/commit/5731b29a4f06e544d4e25751f7abcf863ac25fb7))
* code analysis round 2 - error handling and test coverage ([c055400](https://github.com/tyevco/pulumi-homelab/commit/c05540077fefdc05dfa1732853398587efb8c729))
* stop LXC container before deleting to prevent deletion failures ([7699b9f](https://github.com/tyevco/pulumi-homelab/commit/7699b9ff9f6b68d55ea0b1ec21817f4606d41ab9))
* unwrap secrets inside arrays recursively ([fd5267a](https://github.com/tyevco/pulumi-homelab/commit/fd5267aecc21ca99fdbd0e7fc0dec0dab3be8ba1))

## [0.2.3](https://github.com/tyevco/pulumi-homelab/compare/v0.2.2...v0.2.3) (2026-03-01)


### Bug Fixes

* use gh release upload instead of softprops/action-gh-release ([7826a40](https://github.com/tyevco/pulumi-homelab/commit/7826a40609f177d2616a60ee18b00db3c6425a42))

## [0.2.2](https://github.com/tyevco/pulumi-homelab/compare/v0.2.1...v0.2.2) (2026-02-28)


### Bug Fixes

* release-please tag matching, CI tests, and publish workflow ([7ee9ef5](https://github.com/tyevco/pulumi-homelab/commit/7ee9ef5846680a78fd08cdd15cfecba7011fd001))
* run publish steps directly in release-please workflow ([e10ec90](https://github.com/tyevco/pulumi-homelab/commit/e10ec9077dd36ea57e91a5cfe1b21bd67049ffe4))

## [0.2.1](https://github.com/tyevco/pulumi-homelab/compare/v0.2.0...v0.2.1) (2026-02-28)


### Bug Fixes

* convert jest config from TypeScript to JavaScript ([7d2e68f](https://github.com/tyevco/pulumi-homelab/commit/7d2e68f1a281535f8e729ad7d4846f5779cca413))
* release-please tag matching and CI test runner ([c103565](https://github.com/tyevco/pulumi-homelab/commit/c103565c9c7faeb87ae28bf0b3c82412563f461b))
* resolve hardcoded version, unhandled promise rejections, and dead code ([2bef660](https://github.com/tyevco/pulumi-homelab/commit/2bef660c6c1c06824adc4ba77aaca68c0a5fd7f1))
* sync versions to v0.2.0, add tests to CI, remove dead code ([9192ae9](https://github.com/tyevco/pulumi-homelab/commit/9192ae9d2e43c1389ca5905b54c2ca7bfcc7efe2))
* use plain v* tags and sync package-lock version ([3f74b68](https://github.com/tyevco/pulumi-homelab/commit/3f74b687ccfa6d77df20af7f5bc5f853389226bd))
