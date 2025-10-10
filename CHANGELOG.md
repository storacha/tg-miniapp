# Changelog

## [2.14.0](https://github.com/storacha/tg-miniapp/compare/v2.13.7...v2.14.0) (2025-10-10)


### Features

* update to latest humanode ([22a13c9](https://github.com/storacha/tg-miniapp/commit/22a13c9507694870bd6a6f88ac81647fdbef1dc2))
* update to latest humanode ([327ea93](https://github.com/storacha/tg-miniapp/commit/327ea9355186391109fbe71ce9ba6b1875b6067b))

## [2.13.7](https://github.com/storacha/tg-miniapp/compare/v2.13.6...v2.13.7) (2025-10-09)


### Bug Fixes

* add single-flight guard for job refreshes and update DB idle timeout ([f1d4c40](https://github.com/storacha/tg-miniapp/commit/f1d4c40d1cef4ad872c73e7a87cd6a4146a141ef))
* add single-flight guard for job refreshes and update DB idle timeout ([c3af4a6](https://github.com/storacha/tg-miniapp/commit/c3af4a6ed16266bd215925d3d4ce66160ee28d0c))

## [2.13.6](https://github.com/storacha/tg-miniapp/compare/v2.13.5...v2.13.6) (2025-10-07)


### Bug Fixes

* remove job ([c9995f8](https://github.com/storacha/tg-miniapp/commit/c9995f819797df429cff67050554cd6f709695bf))
* remove job ([8702b49](https://github.com/storacha/tg-miniapp/commit/8702b49480b6521d409082da35acfd35e035bbb7))

## [2.13.5](https://github.com/storacha/tg-miniapp/compare/v2.13.4...v2.13.5) (2025-10-06)


### Bug Fixes

* missing getServerSnapshot ([e49e65b](https://github.com/storacha/tg-miniapp/commit/e49e65b33f2ed9ef389b10e0c4a2ccbbfdf828ec))
* Missing getServerSnapshot, which is required for server-rendered content ([1cb1c25](https://github.com/storacha/tg-miniapp/commit/1cb1c25f6eeda64f6bf69167cad710ac18bcc189))

## [2.13.4](https://github.com/storacha/tg-miniapp/compare/v2.13.3...v2.13.4) (2025-10-02)


### Bug Fixes

* handle sql notify payload issue ([94e2dff](https://github.com/storacha/tg-miniapp/commit/94e2dff10ce730243b80b91a62bc3f36298ae0b0))
* handle sql notify payload issue and comment out logs to reduce noise ([866545a](https://github.com/storacha/tg-miniapp/commit/866545ade0a4ec0d1e586f90d9e4131b1e6d78df))

## [2.13.3](https://github.com/storacha/tg-miniapp/compare/v2.13.2...v2.13.3) (2025-09-30)


### Bug Fixes

* remove error popup since it's already reported and shouldn't affect users ([84b7a97](https://github.com/storacha/tg-miniapp/commit/84b7a974c2a3dc5f872d70292ea52d5c8fc6eda7))
* update error handler on backup ([9329375](https://github.com/storacha/tg-miniapp/commit/9329375c52e547e276bdb7eb8e51fa371711afd5))

## [2.13.2](https://github.com/storacha/tg-miniapp/compare/v2.13.1...v2.13.2) (2025-09-26)


### Bug Fixes

* handle job queue errors and add missing UTM param to Plausible ([2b37fde](https://github.com/storacha/tg-miniapp/commit/2b37fde28bccc34beae8795f5b47e1fcc9c998f5))

## [2.13.1](https://github.com/storacha/tg-miniapp/compare/v2.13.0...v2.13.1) (2025-09-23)


### Bug Fixes

* build issue ([4b501f5](https://github.com/storacha/tg-miniapp/commit/4b501f552e5a173f6118935c5694940b72131c12))
* chat stale image ([98e183b](https://github.com/storacha/tg-miniapp/commit/98e183be063f83863adde62394629b8a6c0723c4))
* detect and handle non-Telegram environment error ([5f242cf](https://github.com/storacha/tg-miniapp/commit/5f242cf4ef87b2672c0f441a54ac4342e47e40a8))
* env-setup action ([1464037](https://github.com/storacha/tg-miniapp/commit/146403700255e0b012e171bd470a96274f901e6b))
* improve UI alignment, error display formatting & entity image fetching ([eae4b66](https://github.com/storacha/tg-miniapp/commit/eae4b66b5ea87b24da62a0c716e664799dbdbf88))
* improve UI alignment, error display formatting, and entity image fetching ([ba09609](https://github.com/storacha/tg-miniapp/commit/ba09609c4b9c32008c19f102ebf97dc103bdf77f))
* plausible domain ([29293f3](https://github.com/storacha/tg-miniapp/commit/29293f3ddb61441f869790d228a0a92c711e3041))
* plausible integration ([3d44360](https://github.com/storacha/tg-miniapp/commit/3d4436087bb49cedd2506f8000632d6fa6ccd863))

## [2.13.0](https://github.com/storacha/tg-miniapp/compare/v2.12.5...v2.13.0) (2025-09-09)


### Features

* add graceful shutdown for ECS SIGTERM ([ee8edb2](https://github.com/storacha/tg-miniapp/commit/ee8edb206fe8e5f7b784ee29fe8a0361f2424130))
* add graceful shutdown for ECS SIGTERM ([6fdf9e7](https://github.com/storacha/tg-miniapp/commit/6fdf9e76d2f59d32c075d0b542e7390af4a7fdd1))
* add telegram cleanup to graceful shutdown ([5845247](https://github.com/storacha/tg-miniapp/commit/584524763ae98fb559aa6d7fb96d3b5c7d7bd268))
* **server:** add scale-in protection for AWS ([85c5676](https://github.com/storacha/tg-miniapp/commit/85c56767713790d4d46d21c5f0967ea4883e0d0e))


### Bug Fixes

* build issue ([fa06606](https://github.com/storacha/tg-miniapp/commit/fa06606921f5649f950706a7edd3b5203e8623c5))
* update job status to queued ([2b1e0f2](https://github.com/storacha/tg-miniapp/commit/2b1e0f24909f5c9076372a76e28fcb40df09ee25))

## [2.12.5](https://github.com/storacha/tg-miniapp/compare/v2.12.4...v2.12.5) (2025-08-28)


### Bug Fixes

* app crash when viewing a backup ([eaaba80](https://github.com/storacha/tg-miniapp/commit/eaaba8051f3853751d017bb79f54499462e0117e))
* ensure consistent ranking between banner and leaderboard list ([a1a6368](https://github.com/storacha/tg-miniapp/commit/a1a6368f0ec3784830bd1a32efcd6448df502ec3))
* memory leak ([25fafe2](https://github.com/storacha/tg-miniapp/commit/25fafe20fef816caa716fa759cb4959e75b112d4))
* memory leak from TelegramClient ([4b23fa9](https://github.com/storacha/tg-miniapp/commit/4b23fa959747bcc57f03c30ce30da0254788e328))
* multiple UI bugs ([82b6186](https://github.com/storacha/tg-miniapp/commit/82b6186ccf9f8d14a52f5d024795db3512873a3a))
* remove unused setTimeout from error provider ([dc81cf9](https://github.com/storacha/tg-miniapp/commit/dc81cf986a652e0ad525a4f8377ee3ef74dc56b6))
* reset dialog pagination on logout and handle stale entity references ([1e8a0a0](https://github.com/storacha/tg-miniapp/commit/1e8a0a0f791dc28b961910cd66b2f2af2c972470))

## [2.12.4](https://github.com/storacha/tg-miniapp/compare/v2.12.3...v2.12.4) (2025-08-22)


### Bug Fixes

* configure storacha client ([28f42ef](https://github.com/storacha/tg-miniapp/commit/28f42ef1bbac004fd1e6b8f91963de5b1d729c68))
* images not loading after backup is done ([0f6c222](https://github.com/storacha/tg-miniapp/commit/0f6c222f57501ae32be25695e1997e3a514c5197))
* loading backup and images ([d3f8eb9](https://github.com/storacha/tg-miniapp/commit/d3f8eb9ff4ae6c5ea9bfd5c3a2bc902dff3789b7))

## [2.12.3](https://github.com/storacha/tg-miniapp/compare/v2.12.2...v2.12.3) (2025-08-18)


### Bug Fixes

* AUTH_KEY_DUPLICATED, initData expired, missing client disconnect ([fa61f59](https://github.com/storacha/tg-miniapp/commit/fa61f59616a5d680dd3724a56186a3853e40d158))
* **telegram:** clear session for auth key duplicated ([950e5c2](https://github.com/storacha/tg-miniapp/commit/950e5c2b9f32deb6498dcf31c3815c17ca637570))
* **telegram:** properly handle auth experations, catch auth key duplicated, other fixes ([61291db](https://github.com/storacha/tg-miniapp/commit/61291db9d50a6dc5e46fd9eccc1e69f552598f8f))

## [2.12.2](https://github.com/storacha/tg-miniapp/compare/v2.12.1...v2.12.2) (2025-08-14)


### Bug Fixes

* **telegram:** correct callback memoization ([292f8da](https://github.com/storacha/tg-miniapp/commit/292f8dafd6b40a2e4c3e8afd955c1809a71fe744))

## [2.12.1](https://github.com/storacha/tg-miniapp/compare/v2.12.0...v2.12.1) (2025-08-14)


### Bug Fixes

* 'no image' when media is loading ([be1f580](https://github.com/storacha/tg-miniapp/commit/be1f580fcc513ef73d02f1caf716e05b744b3ccf))
* correct percentile calc and load my name no matter where I am ([03e8dd5](https://github.com/storacha/tg-miniapp/commit/03e8dd5020841d59253e52b429960ca86d8acecf))
* correct percentile calc and load my name no matter where I am ([965fd52](https://github.com/storacha/tg-miniapp/commit/965fd52039a0eae4604182891de620acdf04f90d))
* dialogs list shows chats with ?? thumbnail and no name ([3735b18](https://github.com/storacha/tg-miniapp/commit/3735b187923467c40855927824aa6cd5256b1fd0))
* missing pull_request_target event handler in the pr-triage workflow ([75178ae](https://github.com/storacha/tg-miniapp/commit/75178ae972468a1890b313e69010ce8655983f6e))
* multiple UI bugs ([e5c6cea](https://github.com/storacha/tg-miniapp/commit/e5c6cea1dbfd5b89628366b435389b3b488c2414))
* podium too ([18f7eed](https://github.com/storacha/tg-miniapp/commit/18f7eed0d82217c4fca41cd71feb4398a88294ce))
* prevent calendar popover from overflowing screen ([1bde880](https://github.com/storacha/tg-miniapp/commit/1bde8802efe682a97ca0261d0c972d2a07ed5a44))
* prevent calendar popover from overflowing screen ([6b9af46](https://github.com/storacha/tg-miniapp/commit/6b9af46aab2cb377af00b2050035d7c2a39432f4))
* ranking percentile calculation ([635e5e1](https://github.com/storacha/tg-miniapp/commit/635e5e14c4fc0764deacee6bd87fb5b8d6456016))
* use my high quality profile image on leaderboard ([b50681e](https://github.com/storacha/tg-miniapp/commit/b50681efcd02c9aa7f66a662ff996fa21f1a3ecc))
* use my high quality profile image on leaderboard ([3007d83](https://github.com/storacha/tg-miniapp/commit/3007d8373b28db5e22b097faf64597a888a29ab5))
* we may not yet be logged in in the datepicker ([36e8a9d](https://github.com/storacha/tg-miniapp/commit/36e8a9d93a20ba3b9ba7b060cba5b3648fcce72e))
* we may not yet be logged in in the datepicker ([5bad32f](https://github.com/storacha/tg-miniapp/commit/5bad32fcc399f9ef2e40d58cde8601d937758436))

## [2.12.0](https://github.com/storacha/tg-miniapp/compare/v2.11.3...v2.12.0) (2025-08-13)


### Features

* **deploy:** upgrade memory ([549696f](https://github.com/storacha/tg-miniapp/commit/549696fcb6dcb356a2b74af436719bd573248487))


### Bug Fixes

* **deploy:** only use extra memory for prod ([327c193](https://github.com/storacha/tg-miniapp/commit/327c193951b87b8d95955bb59bcd862a93ab5b4a))
* **server:** use rust piece hasher ([c8a9692](https://github.com/storacha/tg-miniapp/commit/c8a9692171c1796527bf243384cb4f815ee9b3d0))

## [2.11.3](https://github.com/storacha/tg-miniapp/compare/v2.11.2...v2.11.3) (2025-08-08)


### Bug Fixes

* improve calendar picker ([506433a](https://github.com/storacha/tg-miniapp/commit/506433a1475698e6566c4f3d75f368fa92f5c1e1))
* improve calendar picker ([5f9e624](https://github.com/storacha/tg-miniapp/commit/5f9e624c3b5aa0048e40bfe76af7b8ef3d89274f))
* let avatar fallback show a gray bg when it is loading instead of "L" ([f6a19c2](https://github.com/storacha/tg-miniapp/commit/f6a19c2e4b6aec14da465b40d07012293d4730f0))
* let avatar fallback show a gray bg when it is loading instead of "L" ([f074d98](https://github.com/storacha/tg-miniapp/commit/f074d985afb24b899c745eb16c059e0a9852c30f))
* lint ([9c92202](https://github.com/storacha/tg-miniapp/commit/9c92202390b19a6c1a75623261151d37fbdfddd3))
* points display and usage report request ([1ae5ad2](https://github.com/storacha/tg-miniapp/commit/1ae5ad2bc0aac74b9e84fd9c1e8ae2e74a890758))
* points display and usage report request ([a62521e](https://github.com/storacha/tg-miniapp/commit/a62521ef5920de7973843b1ad76329b0a58d5895))
* ui issues ([d727ee3](https://github.com/storacha/tg-miniapp/commit/d727ee3ea5e672dd22000f2a1dbef8f3a519d5f7))
* ui issues ([1442bef](https://github.com/storacha/tg-miniapp/commit/1442befdb1f005471ef75c01695f756e195d2309))
* update dependencies ([b1e9f75](https://github.com/storacha/tg-miniapp/commit/b1e9f753c058b664e6df8a219a741a8722c46e44))
* update dependencies ([2a7a8d2](https://github.com/storacha/tg-miniapp/commit/2a7a8d2de849c654dfa047b56b7bbe3d92f55ce5))
* use `openLink` to open the humanode link ([a056005](https://github.com/storacha/tg-miniapp/commit/a05600558d4f13b33eb2663d7766ef4675645174))
* use `openLink` to open the humanode link ([ecf6764](https://github.com/storacha/tg-miniapp/commit/ecf6764c48055a335a35c0753018daa9c19706c0))

## [2.11.2](https://github.com/storacha/tg-miniapp/compare/v2.11.1...v2.11.2) (2025-07-31)


### Bug Fixes

* add StorachaConnect on date page for first login users ([110b261](https://github.com/storacha/tg-miniapp/commit/110b261c5c83ca5b509bef6b0c82b13f44af6292))
* add StorachaConnect on date page for first login users ([a5c51be](https://github.com/storacha/tg-miniapp/commit/a5c51be878281b4f41b9dad8edbb9ab1978dba53))

## [2.11.1](https://github.com/storacha/tg-miniapp/compare/v2.11.0...v2.11.1) (2025-07-29)


### Bug Fixes

* log and capture auth errors _after_ setting state ([47d0d1f](https://github.com/storacha/tg-miniapp/commit/47d0d1fb729508cbcf50f702c4f9e50b14258d1b))
* log and capture auth errors _after_ setting state ([9868b25](https://github.com/storacha/tg-miniapp/commit/9868b25cbcf4c281198cf9b14fffbee57a1dd372))

## [2.11.0](https://github.com/storacha/tg-miniapp/compare/v2.10.1...v2.11.0) (2025-07-28)


### Features

* after one failed login attempt, give the user a way to reset lo… ([801f9ee](https://github.com/storacha/tg-miniapp/commit/801f9ee4be565022d32e96e9165a2a77132a7323))
* after one failed login attempt, give the user a way to reset login state ([5d56ac9](https://github.com/storacha/tg-miniapp/commit/5d56ac93f18e9bd67e52a3de8facef1121290b6f))


### Bug Fixes

* issue with inline url ([15ea823](https://github.com/storacha/tg-miniapp/commit/15ea823385b7b09ad08d65c794926f620b603b16))
* issue with inline url ([0376bb4](https://github.com/storacha/tg-miniapp/commit/0376bb49da100db054560dc1344e63a4bb033c2d))

## [2.10.1](https://github.com/storacha/tg-miniapp/compare/v2.10.0...v2.10.1) (2025-07-24)


### Bug Fixes

* add custom period selection for users with a paid Storacha Plan ([85e1082](https://github.com/storacha/tg-miniapp/commit/85e1082dead72ada24651c0c4b6c6e3a0cf4c04f))
* add custom period selection for users with a paid Storacha Plan ([9f2ccce](https://github.com/storacha/tg-miniapp/commit/9f2cccea6f50dbc6c08a6778445f8b32c1f537d8))
* improve date selection with proper time boundaries ([f274e3e](https://github.com/storacha/tg-miniapp/commit/f274e3ea9abbe92f57b3cd260123df3a9ecd4316))
* **storacha:** give upload/get + space/blob/get caps ([98ee14c](https://github.com/storacha/tg-miniapp/commit/98ee14c28ba6a1336b5008e73b7aac6f270b203f))
* **storacha:** give upload/get + space/blob/get caps ([c87b586](https://github.com/storacha/tg-miniapp/commit/c87b586d2c70081bcaf20ef0989e5d377d25acf4))
* wrong use of db bigint ([c78ae53](https://github.com/storacha/tg-miniapp/commit/c78ae537623574b99aa257d449e8bcf253cb2605))
* wrong use of DB BIGINT ([e704dbc](https://github.com/storacha/tg-miniapp/commit/e704dbc4f88cb3ac2ed6d62fad68604cbe6077d8))

## [2.10.0](https://github.com/storacha/tg-miniapp/compare/v2.9.0...v2.10.0) (2025-07-23)


### Features

* add bot webhook handling ([a3e7617](https://github.com/storacha/tg-miniapp/commit/a3e76176a0b19d46d829f51f5b4574e16aedbe60))
* add bot webhook handling ([ee59daa](https://github.com/storacha/tg-miniapp/commit/ee59daada4801872f98c030fa93fd310971a580a))


### Bug Fixes

* add requested changes ([8c68dc6](https://github.com/storacha/tg-miniapp/commit/8c68dc638004b0945d2c829fa1c5aa991f0bc0f3))
* build issues ([63ca4ad](https://github.com/storacha/tg-miniapp/commit/63ca4ad13f5116618f5805957ec814c36ec47ab9))
* check for user plan before blocking upload ([2820620](https://github.com/storacha/tg-miniapp/commit/2820620e93c47c4c59f7bdf9b093dd375cbb56a1))
* clean up inconsistent phone number UX ([4e5228f](https://github.com/storacha/tg-miniapp/commit/4e5228fb04df064cd1692e8349b31389989b8af3))
* revert CHANGELOG ([4d00df6](https://github.com/storacha/tg-miniapp/commit/4d00df68e8637bcd5e8ff970dcb5666a1d2addf1))
* use the user ID in the telegram session name ([17af0a1](https://github.com/storacha/tg-miniapp/commit/17af0a131d79f552d0ec192a59f40f5f0e7d2484))

## [2.9.0](https://github.com/storacha/tg-miniapp/compare/v2.8.0...v2.9.0) (2025-07-16)


### Features

* add structured, contextual logging to job execution flow ([53ba9e0](https://github.com/storacha/tg-miniapp/commit/53ba9e0f3bbf705a32b69dc2324bbf2a3374b3d2))
* improved job logging with context ([046cbb0](https://github.com/storacha/tg-miniapp/commit/046cbb025d91f653efdc9f629cfbcfb56302f6ab))


### Bug Fixes

* **build:** fix build errors ([1bfd724](https://github.com/storacha/tg-miniapp/commit/1bfd72485a4825ab77525ef3f671bf7647289aba))
* conflicts with main ([5d734fb](https://github.com/storacha/tg-miniapp/commit/5d734fb574e6cf8b0123cbe85f54a6b62ae25b64))
* **jobs:** run processing asyncronously ([c2d7d46](https://github.com/storacha/tg-miniapp/commit/c2d7d46f5257f1947287d7f120642732fc1b6d1d))

## [2.8.0](https://github.com/storacha/tg-miniapp/compare/v2.7.0...v2.8.0) (2025-07-15)


### Features

* set app name to avoid showing pricing table in email ([1878c0a](https://github.com/storacha/tg-miniapp/commit/1878c0a79770a62127fd86f729545d14cb61aa12))

## [2.7.0](https://github.com/storacha/tg-miniapp/compare/v2.6.0...v2.7.0) (2025-07-15)


### Features

* stop backup when people exceed the free storage limit ([b7e9976](https://github.com/storacha/tg-miniapp/commit/b7e9976dcc0ed35b1b226d461fb12eb982f2c4b5))


### Bug Fixes

* add missing usage check on onShardStored ([e0a681d](https://github.com/storacha/tg-miniapp/commit/e0a681d6789821107fbb9bca9f10dfe3f91b1939))

## [2.6.0](https://github.com/storacha/tg-miniapp/compare/v2.5.0...v2.6.0) (2025-07-14)

### Features

- add a CLAUDE.md to make it easier to CLAUDE ([f7158c8](https://github.com/storacha/tg-miniapp/commit/f7158c8ea5f07016c1f901e45eb02574e0be636c))
- add a CLAUDE.md to make it easier to CLAUDE ([8e87ff3](https://github.com/storacha/tg-miniapp/commit/8e87ff327d6109807d573264d36722f251019bf7))
- add ability to delete backups ([89c2888](https://github.com/storacha/tg-miniapp/commit/89c28888a31ebab57d31b839abcd46230545a156))
- add ability to delete backups ([15459db](https://github.com/storacha/tg-miniapp/commit/15459dbadac3899dcbdd3c6300b1706ae3490843))
- add delete backup ([83fa39d](https://github.com/storacha/tg-miniapp/commit/83fa39dcedb2161726f594530e0aa9fc6224c5cb))
- add points and size columns to jobs table for accurate point deduction on dialog deletion ([befb809](https://github.com/storacha/tg-miniapp/commit/befb809d6cb820c6b5ea73dfb29e4a9d896e60bf))
- call delete backup from client side ([9258d48](https://github.com/storacha/tg-miniapp/commit/9258d489d316112313104e71a9865a041e4445f4))
- reintroduce high quality image fetcher ([d81b886](https://github.com/storacha/tg-miniapp/commit/d81b8864d5a613af1426531c071dbbf131bd229f))
- subtract points on backup deletion ([b01fce9](https://github.com/storacha/tg-miniapp/commit/b01fce99dd2ae7b010ef214ec79f5402a170c965))

### Bug Fixes

- add build and test to CI ([aa7801f](https://github.com/storacha/tg-miniapp/commit/aa7801fd9fca48d3d9760176286979b0cf9fb4c7))
- add build and test to CI ([fa48518](https://github.com/storacha/tg-miniapp/commit/fa485188e20cf32ee6b77e4417c99bd1545defe4))
- add missing deps to hook ([0077429](https://github.com/storacha/tg-miniapp/commit/0077429e16b21a10e4d125e4859bdb3769eb4be3))
- fetch high quality images for profile pictures in the list of chats ([7e2ef50](https://github.com/storacha/tg-miniapp/commit/7e2ef50febf177ad683474c5adf368795c1979bf))
- get build working ([d9f16ac](https://github.com/storacha/tg-miniapp/commit/d9f16ac3794af583f9e0edd2e65ec72a50231f24))
- I don't think defaults actually works here ([8c06cf8](https://github.com/storacha/tg-miniapp/commit/8c06cf854bba38da4876a877c5cd8de3d93154af))
- ignore .claude ([27b6523](https://github.com/storacha/tg-miniapp/commit/27b652328b537d72eaeee7ee8ef09c449384f75d))
- ignore .claude ([6529694](https://github.com/storacha/tg-miniapp/commit/6529694e54a636ccecc7a6336946c14f09693e84))
- initialize env in test and build ([b4dfd51](https://github.com/storacha/tg-miniapp/commit/b4dfd5161b38a8353a5b26f7b014c96564559086))
- lint ([b4fdef6](https://github.com/storacha/tg-miniapp/commit/b4fdef63f976daf0ad6a475c1f15bbb6f9fd6312))
- progress calculation ([11b9092](https://github.com/storacha/tg-miniapp/commit/11b909266eab69d4efd66e9c5e9463605d1a8a1d))
- ranking update ([9b60a58](https://github.com/storacha/tg-miniapp/commit/9b60a583d300cadf69ecb050eeb77eed1b40df4d))
- remove complete backup from space if there's only one dialog ([8c3ddfb](https://github.com/storacha/tg-miniapp/commit/8c3ddfb8f9a909c99d40f78de6450a8ae46e792f))
- rename telegram session ([ee9e0d4](https://github.com/storacha/tg-miniapp/commit/ee9e0d42d54274a0e1b74deec2615dcbc88cf0bd))
- Revert "Merge pull request [#224](https://github.com/storacha/tg-miniapp/issues/224) from storacha/feat/hq-images" ([6aac385](https://github.com/storacha/tg-miniapp/commit/6aac3858a7f0116d143d2dd066a3efde4f8a43d9))
- try setting working directory in env setup ([5629b96](https://github.com/storacha/tg-miniapp/commit/5629b9692c5079fde3af4012afc6c3cdec2d71df))
- use env vars to config sentry ([4b797d7](https://github.com/storacha/tg-miniapp/commit/4b797d738d752a9c556d8c1151f078a34c5ec19a))
- use high quality images in the chat header too ([bf24c0b](https://github.com/storacha/tg-miniapp/commit/bf24c0b872bd6b1efb35426aee8508c18b2e1c9f))
- use high quality images in the chat header too ([6db1adc](https://github.com/storacha/tg-miniapp/commit/6db1adcca2e11ab19ad7b3144c2ab9de18be5f15))

## [2.5.0](https://github.com/storacha/tg-miniapp/compare/v2.4.0...v2.5.0) (2025-07-09)

### Features

- **runner:** add video download size selection ([de7d85c](https://github.com/storacha/tg-miniapp/commit/de7d85ca6de895a3f464e62ae4f76bdeaaf7ca00))

### Bug Fixes

- allow cross-site requests to enable Telegram browser support ([b105a7f](https://github.com/storacha/tg-miniapp/commit/b105a7ff8f41476a3f4535e19decfbceb0918e44))
- don't show ranking info if not loaded ([583842f](https://github.com/storacha/tg-miniapp/commit/583842fc5836926323c7efa47f1ff74f56a5c7d0))
- don't show ranking info if not loaded ([443ccb7](https://github.com/storacha/tg-miniapp/commit/443ccb7af8262150831340a7317898af637c0738))
- initdata not found ([a6d0e03](https://github.com/storacha/tg-miniapp/commit/a6d0e03bd926ea2c5c1d0fbe41eafdd702d09ea1))
- lazy load image media ([#225](https://github.com/storacha/tg-miniapp/issues/225)) ([0a9441c](https://github.com/storacha/tg-miniapp/commit/0a9441c2b7509058008d8e702f676fe6a03f33a9))
- only show telegram timeout error if client log level is set to debug ([fa0fa4f](https://github.com/storacha/tg-miniapp/commit/fa0fa4f126d96717a6c1f9bdd04f3a446413f16c))
- **runner:** fix toDocumentAttributeData ([49a85c4](https://github.com/storacha/tg-miniapp/commit/49a85c4a74de84fef3ccbff836684f3b6b754c58))
- **runner:** improve upload tracking ([0adfbb3](https://github.com/storacha/tg-miniapp/commit/0adfbb353d5b3d8c5d2d6fb8e4a06179157965f8))
- show empty backup instead of throwing an error ([13e4371](https://github.com/storacha/tg-miniapp/commit/13e437107c4945d1561b169849dc44b660de8be0))
- show empty backup instead of throwing an error ([328d0e6](https://github.com/storacha/tg-miniapp/commit/328d0e69e3aedf15d820950e376222df5023cf31))
- **utils:** handle chat type ([cb0a150](https://github.com/storacha/tg-miniapp/commit/cb0a150be126e955edff6443c70dc0e13b73cdb9))

## [2.4.0](https://github.com/storacha/tg-miniapp/compare/v2.3.1...v2.4.0) (2025-07-01)

### Features

- highlight myself in the leaderboard ([25f5186](https://github.com/storacha/tg-miniapp/commit/25f51861e70bb793ad772d16a54080ba9cdad59c))
- improve sign in flow ([ca22cb8](https://github.com/storacha/tg-miniapp/commit/ca22cb8287ea2d0109924f2a2a933605995d7370))
- install sentry, for real ([7b9750a](https://github.com/storacha/tg-miniapp/commit/7b9750a545bfa1034b865b5164b5ac25d8cdbbc8))

### Bug Fixes

- add error message for expired email verification link ([3c85278](https://github.com/storacha/tg-miniapp/commit/3c85278a09181694c0c83da57b9f1d16788980e0))
- add error message for expired email verification link ([402ab9a](https://github.com/storacha/tg-miniapp/commit/402ab9ac983c266ea4acb2c5b2bfca3a8b415a19))
- add telegram to `serverExternalPackages` ([6eaf4e3](https://github.com/storacha/tg-miniapp/commit/6eaf4e339b9df3a6d7241b35e31908a0e593fcd3))
- format date-time in current user locale ([9e3869a](https://github.com/storacha/tg-miniapp/commit/9e3869a47d4a2e282ed1ab42f582421fda8608e2))
- format date-time in current user locale ([3ee0a71](https://github.com/storacha/tg-miniapp/commit/3ee0a7142cdc247f75bb416ddaff67fe7e561b5b))
- improve view for unsupported media ([455087a](https://github.com/storacha/tg-miniapp/commit/455087ae83eb222ca426160e1c69883e0439c8d7))
- improve visualization to unsupported media ([01abab4](https://github.com/storacha/tg-miniapp/commit/01abab40aaeb47bd9b184ba0b6fe3032b36db8ab))
- skip unsupported media and fix missing user info header ([437c185](https://github.com/storacha/tg-miniapp/commit/437c18500896450a03d37e083116a88261808dd9))
- skip unsupported media and fix missing user info header ([1de435c](https://github.com/storacha/tg-miniapp/commit/1de435c20adef1c1db73624f59bbf21e35b6cc85))

## [2.3.1](https://github.com/storacha/tg-miniapp/compare/v2.3.0...v2.3.1) (2025-06-27)

### Bug Fixes

- Revert "feat: configure sentry" ([c4b729f](https://github.com/storacha/tg-miniapp/commit/c4b729f1b5c43a7a3b02218847130a5105ea0522))

## [2.3.0](https://github.com/storacha/tg-miniapp/compare/v2.2.3...v2.3.0) (2025-06-27)

### Features

- add /start command ([f6adf8f](https://github.com/storacha/tg-miniapp/commit/f6adf8f2b48cc21e48fbd625d5d41599a9e096d2))
- add /start command ([df8085d](https://github.com/storacha/tg-miniapp/commit/df8085ded70b68515eb8ec3e0884faeee74adbed))
- add storoku config for NEXT_PUBLIC_APP_URI ([87f2d53](https://github.com/storacha/tg-miniapp/commit/87f2d53f2af5e10454ee6503248952bfafd16b89))
- added wrong password error text ([de0567d](https://github.com/storacha/tg-miniapp/commit/de0567d9291bcdef7f5cdfa3f8cfa17c93e776fd))
- configure sentry ([b3fda59](https://github.com/storacha/tg-miniapp/commit/b3fda5986a4b760d7f69d2149c3137e31a31706f))
- install Plausible and get tracking set up ([d624971](https://github.com/storacha/tg-miniapp/commit/d6249718478afb1852dea64fe95bfa5e1a5af1a5))
- install Sentry and Plausible and get tracking set up ([9661cce](https://github.com/storacha/tg-miniapp/commit/9661ccef1bd4018b5961c934519300e728985470))
- track storacha login too ([941e1e4](https://github.com/storacha/tg-miniapp/commit/941e1e4b7ff2df0193172bcc8063494c3cd10ff2))
- track storacha login too ([9ba8186](https://github.com/storacha/tg-miniapp/commit/9ba81869206c0ddf6c7680c8278f8deb668ec3b1))

### Bug Fixes

- add custom error message to when 2fa password is wrong ([eab653a](https://github.com/storacha/tg-miniapp/commit/eab653a18c4ee1625d0daa5e762c182d32babb95))
- add session validaton on load ([9fdd6c4](https://github.com/storacha/tg-miniapp/commit/9fdd6c452254cbcac363d1d8efb678494c3f3878))
- get initials from chat name ([2f3bf02](https://github.com/storacha/tg-miniapp/commit/2f3bf02a18917537d0532c05d6b80681509b4bf8))
- get initials from chat name ([b687b89](https://github.com/storacha/tg-miniapp/commit/b687b89236fb2f0afb5160c54c8b52aa4a3c6da2))
- get isTgAuthorized from useTelegram instead of useGlobal ([066de9e](https://github.com/storacha/tg-miniapp/commit/066de9e503586fd9a56366a9d118e91af137fd0c))
- jobs progress ([#141](https://github.com/storacha/tg-miniapp/issues/141)) ([45b8861](https://github.com/storacha/tg-miniapp/commit/45b88615422cdabbbd1d9a3ac4b493708030151f))
- lint and build ([7b55a79](https://github.com/storacha/tg-miniapp/commit/7b55a7970918571d1d387c2e69dd353172d80912))
- make it possible to pass utm params to the app ([d7516df](https://github.com/storacha/tg-miniapp/commit/d7516df9b1a73a24a762e7537732f741eeba0513))
- only give points after complete upload ([8a72c8f](https://github.com/storacha/tg-miniapp/commit/8a72c8fd5de2991a037c98ca0ea5d083957c8502))
- only give points after upload ([72ab8dc](https://github.com/storacha/tg-miniapp/commit/72ab8dc25b7bead1f7b81f78c037e2ba61917460))
- rebase issue ([b0159f0](https://github.com/storacha/tg-miniapp/commit/b0159f00942a5b90d7ee3eff3185320170133c10))
- remove a dead end ([784ca43](https://github.com/storacha/tg-miniapp/commit/784ca43c901618c152862096060d78100f5a7c63))
- session ([95b878f](https://github.com/storacha/tg-miniapp/commit/95b878fcc0542fd89ec5722d283a335b02a5b5b5))
- session ([df5df42](https://github.com/storacha/tg-miniapp/commit/df5df420fafb7d83ddfba3613f1925b8498ca6c5))
- telegram auth error handling ([f4e9c6d](https://github.com/storacha/tg-miniapp/commit/f4e9c6d44514451ac567c56f4db19f36b1684b82))
- telegram auth error handling ([3e99aa7](https://github.com/storacha/tg-miniapp/commit/3e99aa746878ad3f3dafe6214dd2a8c626738f46))
- throw error if backup does not have messages ([7f98a2e](https://github.com/storacha/tg-miniapp/commit/7f98a2ed7230edd82edbe379069a03c0b53ca259))
- throw error on empty backup and add session validation ([3ee8549](https://github.com/storacha/tg-miniapp/commit/3ee85496436223534db93ee09739f416a3bbef61))
- use a ts file for next.config ([c9a79c7](https://github.com/storacha/tg-miniapp/commit/c9a79c738eef1841dd1ecfacb7911bb5ec5b9c4f))
- use a ts file for next.config ([9e2b4a7](https://github.com/storacha/tg-miniapp/commit/9e2b4a74091a718387d1e431b106c7f84530e0af))

## [2.2.3](https://github.com/storacha/tg-miniapp/compare/v2.2.2...v2.2.3) (2025-06-20)

### Bug Fixes

- logout from app terminate telegram session ([63e7d15](https://github.com/storacha/tg-miniapp/commit/63e7d15a2f2ae8bdfcca340d0e4efd1f1def0573))
- logout from app terminate telegram session ([803e67b](https://github.com/storacha/tg-miniapp/commit/803e67b77aa92511d7adef7a0bafbcee21478aa4))

### Performance Improvements

- add lru cache to help loading backed up chats ([d9c2d11](https://github.com/storacha/tg-miniapp/commit/d9c2d114dbdf4fe7ff167e3c2823296ff5735fe0))
- load media in background with p-map concurrency ([a08a7bb](https://github.com/storacha/tg-miniapp/commit/a08a7bba05be15470106df9dbe00db523495158f))
- recover backed up chat messages in batches ([d770630](https://github.com/storacha/tg-miniapp/commit/d7706305139e3e9d54bd66f653f6aa6b0c09b40e))

## [2.2.2](https://github.com/storacha/tg-miniapp/compare/v2.2.1...v2.2.2) (2025-06-13)

### Bug Fixes

- backed up chats loading and sort order ([5d9a775](https://github.com/storacha/tg-miniapp/commit/5d9a77573e5ba6226177d12cf7ccb4ba68e7cf33))
- backed up chats loading and sort order ([2950dfc](https://github.com/storacha/tg-miniapp/commit/2950dfc8603f02f1de3008ef90d1e2d1f9e2e55b))
- select backup sort order ([fa4057a](https://github.com/storacha/tg-miniapp/commit/fa4057a8ed22a78a650a520f0bb28969074228e9))

## [2.2.1](https://github.com/storacha/tg-miniapp/compare/v2.2.0...v2.2.1) (2025-06-12)

### Bug Fixes

- display current users name in leaderboard ([4baca77](https://github.com/storacha/tg-miniapp/commit/4baca77ab4371a27f781e4c3fb59c145230800ea))
- leaderboard names ([924a465](https://github.com/storacha/tg-miniapp/commit/924a465908c454373c4879862afdf0f96b3729fa))
- **server:** handle unknown exception ([3e095fb](https://github.com/storacha/tg-miniapp/commit/3e095fbadd37b51be67713aabf1667f3042777e7))
- **server:** remove unused var ([4ef30ca](https://github.com/storacha/tg-miniapp/commit/4ef30ca7e08e76ee207a6ff65afd110eb0aca892))

## [2.2.0](https://github.com/storacha/tg-miniapp/compare/v2.1.1...v2.2.0) (2025-06-12)

### Features

- add humanode ([7bb460c](https://github.com/storacha/tg-miniapp/commit/7bb460cea9a27a3696001d6a9b47603b813573ad))

### Bug Fixes

- allow users to cancel a stuck backup ([3baa8dd](https://github.com/storacha/tg-miniapp/commit/3baa8dd446a53554d54662b5827276d8da4f8c06))
- change the deploy config to include the humanode envs ([bd25736](https://github.com/storacha/tg-miniapp/commit/bd257363bb26708648c7f844ee9682c9035c2bfb))
- change the deploy config to include the humanode envs ([e510e65](https://github.com/storacha/tg-miniapp/commit/e510e65fbab73b2a2b88faf5c17ca8c02b22887f))
- **deploy:** update storoku, no replicaiton conf ([b5c00cf](https://github.com/storacha/tg-miniapp/commit/b5c00cf2def8f90358d05b7ad1eda0370244de62))
- ensure consistent encryption password to prevent dialog not found errors ([bdc9145](https://github.com/storacha/tg-miniapp/commit/bdc914568b4c9b67e69a05e7483a6095e0911531))
- ensure users can cancel a stuck backup ([dda59e1](https://github.com/storacha/tg-miniapp/commit/dda59e1cd4c285a32f1f50d4b519afe1d233c395))
- get entity bug ([ab6d51c](https://github.com/storacha/tg-miniapp/commit/ab6d51c3382ad0a9d3490652b1f662ef3c45c013))
- leaderboard page now displays first place as [#1](https://github.com/storacha/tg-miniapp/issues/1) instead of [#0](https://github.com/storacha/tg-miniapp/issues/0) ([a6ecd86](https://github.com/storacha/tg-miniapp/commit/a6ecd86247864a34022d597db859894f75945172))
- store dialog info in db instead of just dialog IDs ([2f9918b](https://github.com/storacha/tg-miniapp/commit/2f9918b8a6f7b859033e261a130745e7e84a3987))
- update stuck job timout to 3 hours ([f46069b](https://github.com/storacha/tg-miniapp/commit/f46069ba587da37aa9f7eac08f7e304c3b60cf24))

## [2.1.1](https://github.com/storacha/tg-miniapp/compare/v2.1.0...v2.1.1) (2025-06-06)

### Bug Fixes

- telegram auth message ([45924c3](https://github.com/storacha/tg-miniapp/commit/45924c3f86702bf94651b3ae3a9c861a07b825a6))
- telegram auth message typo ([02159dc](https://github.com/storacha/tg-miniapp/commit/02159dcf15eeda0a6eb3c4232efeb9319c7afbcb))

## [2.1.0](https://github.com/storacha/tg-miniapp/compare/v2.0.2...v2.1.0) (2025-06-05)

### Features

- add x-client header ([#103](https://github.com/storacha/tg-miniapp/issues/103)) ([04f99c3](https://github.com/storacha/tg-miniapp/commit/04f99c3c75603ed1548c07c3e6f1b1f3db1d878e))

### Bug Fixes

- add missing check to chat entity ([3a98051](https://github.com/storacha/tg-miniapp/commit/3a98051052af47b89557a1cbacd9626f67ff6df5))
- allow setError(null) to properly clear and close the error dialog ([a92a9b6](https://github.com/storacha/tg-miniapp/commit/a92a9b663568273693a22384af6492344323be54))
- isolate telegram client per session ([9fbfd2b](https://github.com/storacha/tg-miniapp/commit/9fbfd2bc1477079b98e6d399ec3b1a0b0f36bc1e))

## [2.0.2](https://github.com/storacha/tg-miniapp/compare/v2.0.1...v2.0.2) (2025-05-28)

### Bug Fixes

- **dashboard:** show safe icon if there aren't backups ([1e830d5](https://github.com/storacha/tg-miniapp/commit/1e830d5db181235af6e897c093f033f0ecf084a2))

## [2.0.1](https://github.com/storacha/tg-miniapp/compare/v2.0.0...v2.0.1) (2025-05-28)

### Bug Fixes

- **login:** raise exceptions for login errors ([e236d04](https://github.com/storacha/tg-miniapp/commit/e236d04d1bea066e53dbb0f4a1428faba69670d5))

## [2.0.0](https://github.com/storacha/tg-miniapp/compare/v1.4.0...v2.0.0) (2025-05-28)

### ⚠ BREAKING CHANGES

- **jobs:** removes UCAN

### Features

- add audio, video and animation visualization ([94e8c7e](https://github.com/storacha/tg-miniapp/commit/94e8c7e984a0a3be1b82fbf6ab2c58f8c8f384e0))
- add invocation tracking ([#43](https://github.com/storacha/tg-miniapp/issues/43)) ([fdac461](https://github.com/storacha/tg-miniapp/commit/fdac46142457db87a5140a1901a65f397a25cac8))
- add media backup ([9732cdc](https://github.com/storacha/tg-miniapp/commit/9732cdc6123e5fdc7a4d2251df0ddb6ec6c6a101))
- add media types ([bece45b](https://github.com/storacha/tg-miniapp/commit/bece45b459eea53b1f3820e08477a28132d8f9e5))
- add media types ([008efdc](https://github.com/storacha/tg-miniapp/commit/008efdccd9cbd4e157547f1f40d45026f0278a87))
- add message types ([#42](https://github.com/storacha/tg-miniapp/issues/42)) ([6dde2d3](https://github.com/storacha/tg-miniapp/commit/6dde2d3885615f2fe9c1a32a0d846d965296368c))
- add missing media types ([3542576](https://github.com/storacha/tg-miniapp/commit/35425768db6259ed318178a05db6976cb4948bdb))
- add pdf preview ([0c35add](https://github.com/storacha/tg-miniapp/commit/0c35addbf9cf5b0e446e7caa8263f8fed5b8db09))
- add poll and webpage media visualization ([1be6702](https://github.com/storacha/tg-miniapp/commit/1be6702cb82b8a08345c994139daa15c2d95ef05))
- add remaining media types ([f62158c](https://github.com/storacha/tg-miniapp/commit/f62158c32e00df46f03b959388c00a9629932818))
- add select backup screen ([5d27f09](https://github.com/storacha/tg-miniapp/commit/5d27f09cdfaeb3e420cff370ce8bcc202b4aa966))
- add select backup screen ([12ee6b6](https://github.com/storacha/tg-miniapp/commit/12ee6b66a71f02eca908137564dd509e09ff5045))
- add support for 2FA enabled accounts ([#54](https://github.com/storacha/tg-miniapp/issues/54)) ([b77698c](https://github.com/storacha/tg-miniapp/commit/b77698c543c089300eb8daf65263aa3019840e66))
- add-backend ([#20](https://github.com/storacha/tg-miniapp/issues/20)) ([8245996](https://github.com/storacha/tg-miniapp/commit/8245996bf08bc82f9f8be8379f9acb902ab743a0))
- added mock route ([fa87b5c](https://github.com/storacha/tg-miniapp/commit/fa87b5c53a2811d6f0dad29c1016a1a942b3852f))
- added telegram init root component ([fc3d5e4](https://github.com/storacha/tg-miniapp/commit/fc3d5e4f00f7ff383ad2ded9e548d5ccd3fb2366))
- backup encrypted media file with some metadata ([7359975](https://github.com/storacha/tg-miniapp/commit/73599754e892887e748252354afa610f46be5fcf))
- biome config ([f7401f1](https://github.com/storacha/tg-miniapp/commit/f7401f18c18f4bfe40a34af8bb89bfe141c9691b))
- cleanup ([c70db11](https://github.com/storacha/tg-miniapp/commit/c70db118b784ce3809118cd6a1f06a41ec5b274a))
- cleanup ([6a9c528](https://github.com/storacha/tg-miniapp/commit/6a9c528bd1b7ec2358365d5d93f622f119128ba8))
- **create-turbo:** apply official-starter transform ([b519b32](https://github.com/storacha/tg-miniapp/commit/b519b327f497ce288cc5a0294d70844c85b227d6))
- **create-turbo:** apply pnpm-eslint transform ([80024d0](https://github.com/storacha/tg-miniapp/commit/80024d0a6769ebf8b6d035a2119248e26b49367d))
- **create-turbo:** create basic ([2db6118](https://github.com/storacha/tg-miniapp/commit/2db6118ed19020580ceef257b90cc006ed2db6f0))
- **create-turbo:** install dependencies ([b9ce214](https://github.com/storacha/tg-miniapp/commit/b9ce21466da2d70ce838b7cfe2c23ecac52e8dc5))
- dashboard layout ([9f88b6f](https://github.com/storacha/tg-miniapp/commit/9f88b6f5d2661d63b5bf50bc7d5ff2152f3a9b61))
- **deploy:** add deployment ([2022e63](https://github.com/storacha/tg-miniapp/commit/2022e6355341ccffb4df7698d302afa2326d6904))
- home ui ([9dbe531](https://github.com/storacha/tg-miniapp/commit/9dbe5315c6929814d82ea9ebcccf34a9d1d97ad3))
- implement backup of service messages ([#56](https://github.com/storacha/tg-miniapp/issues/56)) ([7d75af9](https://github.com/storacha/tg-miniapp/commit/7d75af9b71a061033379efdfe6c9e5c07ee80f3d))
- improve ui and add geo media visualization ([6874b9f](https://github.com/storacha/tg-miniapp/commit/6874b9f19415b8b4cb1677324a41ae470cb8ff87))
- **infra:** add sqs queue for jobs ([87b73d5](https://github.com/storacha/tg-miniapp/commit/87b73d5e58989b319f3de24a1df8980f17490e81))
- init data ([54d7a0e](https://github.com/storacha/tg-miniapp/commit/54d7a0e4739deb913b1768fa3e4dc693611dfaac))
- **jobs:** move to a sql based job service ([9af8f36](https://github.com/storacha/tg-miniapp/commit/9af8f3626fa088f200d13f07066146fe14bb7269))
- leaderboard , sidebar and backup ui ([00eae2a](https://github.com/storacha/tg-miniapp/commit/00eae2ada805a7d219a7a4176240265aa554432d))
- **leaderboard:** add leaderboard backend ([ae31e30](https://github.com/storacha/tg-miniapp/commit/ae31e30f216ff69c3f049b1932509e94d03db74f))
- mocking onboarding, auth tg and updated new dashboard design ([3dfbd21](https://github.com/storacha/tg-miniapp/commit/3dfbd214ddf59e4e36f5af6ecac622061ea8309a))
- mostly implemented many bugs ([14ace0a](https://github.com/storacha/tg-miniapp/commit/14ace0a79e0941d8e4a47a85fd12a356e20eae53))
- move getDialogs to server side ([f2d43d2](https://github.com/storacha/tg-miniapp/commit/f2d43d22233a63219f421f389c4b2f923ce4c0c6))
- onboarding, dashboard and backup ui ([7dfe752](https://github.com/storacha/tg-miniapp/commit/7dfe752e4f9b45fcaef825c269ef1b2fb58f173c))
- retrieve backup from storacha ([7e33341](https://github.com/storacha/tg-miniapp/commit/7e33341a9ca5d725c5cb616744762544a9bd6331))
- retrieve backup from storacha ([b7c3c2d](https://github.com/storacha/tg-miniapp/commit/b7c3c2d46b7d14fd088ea9c4c59be3eb5a577d4d))
- **server:** add new server architecture, with no actual api ([3bc1b1e](https://github.com/storacha/tg-miniapp/commit/3bc1b1eb7a6f75a4b4bf9227c3996d314a224328))
- **server:** added basic service routes ([e055a4f](https://github.com/storacha/tg-miniapp/commit/e055a4fdc4cd4e461d3d37c364d13ed34cc65e9a))
- **server:** many stability improvements ([38fa10a](https://github.com/storacha/tg-miniapp/commit/38fa10a6c4233e4a12e7ad6ed27d5fd2c72e75c7))
- **server:** working server backup ([5f0eeed](https://github.com/storacha/tg-miniapp/commit/5f0eeed429f978b2ce3aefcacc7aeb0ef3689725))
- service message types ([#55](https://github.com/storacha/tg-miniapp/issues/55)) ([36a89ae](https://github.com/storacha/tg-miniapp/commit/36a89ae6a074fbc0a2e42c3d4d42c1dbb2e4ae11))
- set up CI for the app ([7585a60](https://github.com/storacha/tg-miniapp/commit/7585a602b3b32c8b44e25314aef5fee6790df087))
- show latest backup time ([#36](https://github.com/storacha/tg-miniapp/issues/36)) ([c088586](https://github.com/storacha/tg-miniapp/commit/c08858628c1075f021e461ba7d70a3ab96ea7cea))
- **telegram:** fix auth for latest changes ([717df25](https://github.com/storacha/tg-miniapp/commit/717df25901fb00f9cb84c754ffeb6f41863cc3c4))
- use ucn ([23c0a9b](https://github.com/storacha/tg-miniapp/commit/23c0a9b6efa60c32121adf74c1d7e94b811676d7))

### Bug Fixes

- add .env.tpl ([66a5092](https://github.com/storacha/tg-miniapp/commit/66a5092049dabefce903dbf8080053385bec7da7))
- adjust backup page id to ignore message service type ([3508469](https://github.com/storacha/tg-miniapp/commit/35084697f1e699a2b13094a8e45615a003a2c7c0))
- adjust message dialogs and thumbnail ([e0db54d](https://github.com/storacha/tg-miniapp/commit/e0db54dc413ee1fe3f8ce63ef2d46ca9ff83c7e2))
- adjust toPhotoData return type ([5a40f2c](https://github.com/storacha/tg-miniapp/commit/5a40f2c0e1f8b4d086022f481b610daf6bb2f381))
- adjust ui issues ([dd93410](https://github.com/storacha/tg-miniapp/commit/dd93410eb631b856ec95137c39acd8d23fb9e25d))
- alternate fix for working directory issue ([d97e673](https://github.com/storacha/tg-miniapp/commit/d97e673ab0c5e8f55b27a20c8fc72cffe16a6f28))
- auth key duplicated ([b8302d1](https://github.com/storacha/tg-miniapp/commit/b8302d1be8b9590a103d9a238b89c314ad329fff))
- back button when creating backup ([#45](https://github.com/storacha/tg-miniapp/issues/45)) ([17e545c](https://github.com/storacha/tg-miniapp/commit/17e545cb221df6a614b14a0a4b9b835deda0e98f))
- back to npx ([2333530](https://github.com/storacha/tg-miniapp/commit/23335302fa0c6e1d8ebe5c324f1fd3ab204cfdbc))
- bugfix missing messages in chat with a user ([51fa19b](https://github.com/storacha/tg-miniapp/commit/51fa19b3e0f2fd916a297df5a7bb5728ac9bfc3a))
- cat output to GITHUB_OUTPUT ([d58fed8](https://github.com/storacha/tg-miniapp/commit/d58fed87a6d1b4e80df73c2a76d483257cb47645))
- compatibility date ([b9d0549](https://github.com/storacha/tg-miniapp/commit/b9d05491c0235ff4ebbb84fc8d90b6bd6ac490b1))
- connect client if not already connected ([b910f04](https://github.com/storacha/tg-miniapp/commit/b910f04307be3521c82b95aa88b4dd5535f1c75a))
- correctly identify outgoing messages ([ae0206e](https://github.com/storacha/tg-miniapp/commit/ae0206ecabf81730f5446c02f400b25dfdff93cc))
- default gateway URL ([#59](https://github.com/storacha/tg-miniapp/issues/59)) ([b54afbb](https://github.com/storacha/tg-miniapp/commit/b54afbbb67a6d0e224b02e53adcbfb02fe4c02a6))
- **deploy:** update storoku ([75b617d](https://github.com/storacha/tg-miniapp/commit/75b617dbcc3d5b21c369b2ecf9be1ebaeb28ffd9))
- **deploy:** update storoku to add env vars ([4aa77a3](https://github.com/storacha/tg-miniapp/commit/4aa77a3b805855509046325d05c76822e1b2c790))
- encrypt root block ([11050fb](https://github.com/storacha/tg-miniapp/commit/11050fba85f02d21a45a7367175bcb7bae0b5aff))
- encrypt root block ([#70](https://github.com/storacha/tg-miniapp/issues/70)) ([7fd2a08](https://github.com/storacha/tg-miniapp/commit/7fd2a08ec40b05f8a21b752f118354023768a186))
- I think this might just be built in now ([4d81a0a](https://github.com/storacha/tg-miniapp/commit/4d81a0a88cc357e699ee369cd3ed248889960fe8))
- initials ([#61](https://github.com/storacha/tg-miniapp/issues/61)) ([a7cc583](https://github.com/storacha/tg-miniapp/commit/a7cc583d690dad5a4dfa4471a38cffe7b7efc668))
- install wrangler! ([d9d04f1](https://github.com/storacha/tg-miniapp/commit/d9d04f1b4b1fc1e27bebb867c632979d58166b93))
- keep trying ([6159b52](https://github.com/storacha/tg-miniapp/commit/6159b52aa0a1e75f8af8d94c8998ae8956cff200))
- logout from storacha ([#48](https://github.com/storacha/tg-miniapp/issues/48)) ([15f35b7](https://github.com/storacha/tg-miniapp/commit/15f35b761809e4a5705d2cd26f11ae5a73f884c7))
- make it work ([e1d0475](https://github.com/storacha/tg-miniapp/commit/e1d04759972d1ab1f6261381d142bee9a73023d6))
- move directive ([2e6bb65](https://github.com/storacha/tg-miniapp/commit/2e6bb65f624ed7ca21d3e969cb201006dd389490))
- multiline output handling ([fffecc8](https://github.com/storacha/tg-miniapp/commit/fffecc8d4142828d13b14680100c75e77304efb8))
- ok so pnpm might be right now ([0315f3b](https://github.com/storacha/tg-miniapp/commit/0315f3b1e993daa4b5b155ecebaa914f678b5cd0))
- one more attempt ([787952c](https://github.com/storacha/tg-miniapp/commit/787952c1bc9994c5f614bf40f7ab5361bb61a37e))
- one more try ([34ab4ba](https://github.com/storacha/tg-miniapp/commit/34ab4ba3a5795c102f799cd73911e4a2a77d79cc))
- one more try ([fbe7584](https://github.com/storacha/tg-miniapp/commit/fbe7584e0cf9f3c295548f13611bdce4bcb30f35))
- parse backup data ([1725808](https://github.com/storacha/tg-miniapp/commit/1725808cb33efaf2c23c2f9261ce8c77301ef49a))
- remove line that broke build ([39a4f1e](https://github.com/storacha/tg-miniapp/commit/39a4f1efcb6eaa725f27d8f63cf50435d11b5d45))
- rendering while loading chats ([59510f5](https://github.com/storacha/tg-miniapp/commit/59510f59b0729a1e82fccbb43cc42c3deda4298c))
- required release please permissions ([b391069](https://github.com/storacha/tg-miniapp/commit/b3910697a8b3e50a3ab0c2b1e24d656da113059c))
- **server:** fix constant name ([ab8ae97](https://github.com/storacha/tg-miniapp/commit/ab8ae97d6cf5b5ab733f6362c15e7b7e46c7449d))
- **server:** remove refs to @storacha/ui-react ([4936377](https://github.com/storacha/tg-miniapp/commit/493637767cd9b65151c37da73ff4b21c34aae6a1))
- set working directory in step directly ([c19409b](https://github.com/storacha/tg-miniapp/commit/c19409b7817bf16911bc9568263095c90f39308b))
- starting feedback ([26d182b](https://github.com/storacha/tg-miniapp/commit/26d182b9603d9aff53413d049be71e4e7796923d))
- telegram API ID and hash ([87e1ccb](https://github.com/storacha/tg-miniapp/commit/87e1ccb72c03dacb8f54b6a3daad79cd29929141))
- telegram auth needs telegram provider ([7a77e8e](https://github.com/storacha/tg-miniapp/commit/7a77e8e36ae1e033f23954038b7a720f89390280))
- try using a different output capture action that supports working directories ([d70077c](https://github.com/storacha/tg-miniapp/commit/d70077c97ffbf8e58e77676157095e2c5e555b2e))
- try using pnpm rather than npx in hopes it respects the working directory ([332e1e1](https://github.com/storacha/tg-miniapp/commit/332e1e1d35a50a85a3a00b8059142639b0444893))
- typos ([#21](https://github.com/storacha/tg-miniapp/issues/21)) ([e91c697](https://github.com/storacha/tg-miniapp/commit/e91c6977809f947095c23ee10aaf807f35db7a36))
- use entity ID on dialog item click handler ([01f6ba4](https://github.com/storacha/tg-miniapp/commit/01f6ba479ba9db1a5d808c228f7dd74e3aa67a5b))
- useEffect in telegram provider ([c63b141](https://github.com/storacha/tg-miniapp/commit/c63b1411a6b418adaf8f1c0cdf2a79153e1a363f))

## [1.4.0](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.3.3...tg-mini-app-v1.4.0) (2025-04-24)

### Features

- add media types ([008efdc](https://github.com/storacha/tg-miniapp/commit/008efdccd9cbd4e157547f1f40d45026f0278a87))
- add missing media types ([3542576](https://github.com/storacha/tg-miniapp/commit/35425768db6259ed318178a05db6976cb4948bdb))

### Bug Fixes

- adjust toPhotoData return type ([5a40f2c](https://github.com/storacha/tg-miniapp/commit/5a40f2c0e1f8b4d086022f481b610daf6bb2f381))

### Other Changes

- address review comments ([4d96f5e](https://github.com/storacha/tg-miniapp/commit/4d96f5e3a6616e56cc133e208d4c75b6d1546387))

## [1.3.3](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.3.2...tg-mini-app-v1.3.3) (2025-04-24)

### Bug Fixes

- compatibility date ([b9d0549](https://github.com/storacha/tg-miniapp/commit/b9d05491c0235ff4ebbb84fc8d90b6bd6ac490b1))

## [1.3.2](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.3.1...tg-mini-app-v1.3.2) (2025-04-23)

### Bug Fixes

- default gateway URL ([#59](https://github.com/storacha/tg-miniapp/issues/59)) ([b54afbb](https://github.com/storacha/tg-miniapp/commit/b54afbbb67a6d0e224b02e53adcbfb02fe4c02a6))
- initials ([#61](https://github.com/storacha/tg-miniapp/issues/61)) ([a7cc583](https://github.com/storacha/tg-miniapp/commit/a7cc583d690dad5a4dfa4471a38cffe7b7efc668))
- rendering while loading chats ([59510f5](https://github.com/storacha/tg-miniapp/commit/59510f59b0729a1e82fccbb43cc42c3deda4298c))

## [1.3.1](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.3.0...tg-mini-app-v1.3.1) (2025-04-22)

### Bug Fixes

- use entity ID on dialog item click handler ([01f6ba4](https://github.com/storacha/tg-miniapp/commit/01f6ba479ba9db1a5d808c228f7dd74e3aa67a5b))

### Other Changes

- address review comments ([bd7d684](https://github.com/storacha/tg-miniapp/commit/bd7d6844e5d70341460bd24c52ed52b3c81d77b2))
- fix merge conflicts ([e0fdf26](https://github.com/storacha/tg-miniapp/commit/e0fdf265bb0729c243de0400c97f16617b52a37d))

## [1.3.0](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.2.1...tg-mini-app-v1.3.0) (2025-04-22)

### Features

- add support for 2FA enabled accounts ([#54](https://github.com/storacha/tg-miniapp/issues/54)) ([b77698c](https://github.com/storacha/tg-miniapp/commit/b77698c543c089300eb8daf65263aa3019840e66))
- implement backup of service messages ([#56](https://github.com/storacha/tg-miniapp/issues/56)) ([7d75af9](https://github.com/storacha/tg-miniapp/commit/7d75af9b71a061033379efdfe6c9e5c07ee80f3d))
- service message types ([#55](https://github.com/storacha/tg-miniapp/issues/55)) ([36a89ae](https://github.com/storacha/tg-miniapp/commit/36a89ae6a074fbc0a2e42c3d4d42c1dbb2e4ae11))

## [1.2.1](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.2.0...tg-mini-app-v1.2.1) (2025-04-16)

### Bug Fixes

- useEffect in telegram provider ([c63b141](https://github.com/storacha/tg-miniapp/commit/c63b1411a6b418adaf8f1c0cdf2a79153e1a363f))

## [1.2.0](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.1.0...tg-mini-app-v1.2.0) (2025-04-16)

### Features

- add message types ([#42](https://github.com/storacha/tg-miniapp/issues/42)) ([6dde2d3](https://github.com/storacha/tg-miniapp/commit/6dde2d3885615f2fe9c1a32a0d846d965296368c))

## [1.1.0](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.0.4...tg-mini-app-v1.1.0) (2025-04-16)

### Features

- add invocation tracking ([#43](https://github.com/storacha/tg-miniapp/issues/43)) ([fdac461](https://github.com/storacha/tg-miniapp/commit/fdac46142457db87a5140a1901a65f397a25cac8))

### Bug Fixes

- back button when creating backup ([#45](https://github.com/storacha/tg-miniapp/issues/45)) ([17e545c](https://github.com/storacha/tg-miniapp/commit/17e545cb221df6a614b14a0a4b9b835deda0e98f))

## [1.0.4](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.0.3...tg-mini-app-v1.0.4) (2025-04-16)

### Bug Fixes

- logout from storacha ([#48](https://github.com/storacha/tg-miniapp/issues/48)) ([15f35b7](https://github.com/storacha/tg-miniapp/commit/15f35b761809e4a5705d2cd26f11ae5a73f884c7))

## [1.0.3](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.0.2...tg-mini-app-v1.0.3) (2025-04-16)

### Bug Fixes

- connect client if not already connected ([b910f04](https://github.com/storacha/tg-miniapp/commit/b910f04307be3521c82b95aa88b4dd5535f1c75a))

## [1.0.2](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.0.1...tg-mini-app-v1.0.2) (2025-04-16)

### Bug Fixes

- telegram API ID and hash ([87e1ccb](https://github.com/storacha/tg-miniapp/commit/87e1ccb72c03dacb8f54b6a3daad79cd29929141))

## [1.0.1](https://github.com/storacha/tg-miniapp/compare/tg-mini-app-v1.0.0...tg-mini-app-v1.0.1) (2025-04-16)

### Bug Fixes

- required release please permissions ([b391069](https://github.com/storacha/tg-miniapp/commit/b3910697a8b3e50a3ab0c2b1e24d656da113059c))

## 1.0.0 (2025-04-16)

### Features

- add-backend ([#20](https://github.com/storacha/tg-miniapp/issues/20)) ([8245996](https://github.com/storacha/tg-miniapp/commit/8245996bf08bc82f9f8be8379f9acb902ab743a0))
- added mock route ([fa87b5c](https://github.com/storacha/tg-miniapp/commit/fa87b5c53a2811d6f0dad29c1016a1a942b3852f))
- added telegram init root component ([fc3d5e4](https://github.com/storacha/tg-miniapp/commit/fc3d5e4f00f7ff383ad2ded9e548d5ccd3fb2366))
- biome config ([f7401f1](https://github.com/storacha/tg-miniapp/commit/f7401f18c18f4bfe40a34af8bb89bfe141c9691b))
- cleanup ([c70db11](https://github.com/storacha/tg-miniapp/commit/c70db118b784ce3809118cd6a1f06a41ec5b274a))
- cleanup ([6a9c528](https://github.com/storacha/tg-miniapp/commit/6a9c528bd1b7ec2358365d5d93f622f119128ba8))
- **create-turbo:** apply official-starter transform ([b519b32](https://github.com/storacha/tg-miniapp/commit/b519b327f497ce288cc5a0294d70844c85b227d6))
- **create-turbo:** apply pnpm-eslint transform ([80024d0](https://github.com/storacha/tg-miniapp/commit/80024d0a6769ebf8b6d035a2119248e26b49367d))
- **create-turbo:** create basic ([2db6118](https://github.com/storacha/tg-miniapp/commit/2db6118ed19020580ceef257b90cc006ed2db6f0))
- **create-turbo:** install dependencies ([b9ce214](https://github.com/storacha/tg-miniapp/commit/b9ce21466da2d70ce838b7cfe2c23ecac52e8dc5))
- dashboard layout ([9f88b6f](https://github.com/storacha/tg-miniapp/commit/9f88b6f5d2661d63b5bf50bc7d5ff2152f3a9b61))
- home ui ([9dbe531](https://github.com/storacha/tg-miniapp/commit/9dbe5315c6929814d82ea9ebcccf34a9d1d97ad3))
- init data ([54d7a0e](https://github.com/storacha/tg-miniapp/commit/54d7a0e4739deb913b1768fa3e4dc693611dfaac))
- leaderboard , sidebar and backup ui ([00eae2a](https://github.com/storacha/tg-miniapp/commit/00eae2ada805a7d219a7a4176240265aa554432d))
- mocking onboarding, auth tg and updated new dashboard design ([3dfbd21](https://github.com/storacha/tg-miniapp/commit/3dfbd214ddf59e4e36f5af6ecac622061ea8309a))
- onboarding, dashboard and backup ui ([7dfe752](https://github.com/storacha/tg-miniapp/commit/7dfe752e4f9b45fcaef825c269ef1b2fb58f173c))
- **server:** added basic service routes ([e055a4f](https://github.com/storacha/tg-miniapp/commit/e055a4fdc4cd4e461d3d37c364d13ed34cc65e9a))
- set up CI for the app ([7585a60](https://github.com/storacha/tg-miniapp/commit/7585a602b3b32c8b44e25314aef5fee6790df087))
- show latest backup time ([#36](https://github.com/storacha/tg-miniapp/issues/36)) ([c088586](https://github.com/storacha/tg-miniapp/commit/c08858628c1075f021e461ba7d70a3ab96ea7cea))

### Bug Fixes

- add .env.tpl ([66a5092](https://github.com/storacha/tg-miniapp/commit/66a5092049dabefce903dbf8080053385bec7da7))
- alternate fix for working directory issue ([d97e673](https://github.com/storacha/tg-miniapp/commit/d97e673ab0c5e8f55b27a20c8fc72cffe16a6f28))
- back to npx ([2333530](https://github.com/storacha/tg-miniapp/commit/23335302fa0c6e1d8ebe5c324f1fd3ab204cfdbc))
- cat output to GITHUB_OUTPUT ([d58fed8](https://github.com/storacha/tg-miniapp/commit/d58fed87a6d1b4e80df73c2a76d483257cb47645))
- I think this might just be built in now ([4d81a0a](https://github.com/storacha/tg-miniapp/commit/4d81a0a88cc357e699ee369cd3ed248889960fe8))
- install wrangler! ([d9d04f1](https://github.com/storacha/tg-miniapp/commit/d9d04f1b4b1fc1e27bebb867c632979d58166b93))
- keep trying ([6159b52](https://github.com/storacha/tg-miniapp/commit/6159b52aa0a1e75f8af8d94c8998ae8956cff200))
- move directive ([2e6bb65](https://github.com/storacha/tg-miniapp/commit/2e6bb65f624ed7ca21d3e969cb201006dd389490))
- multiline output handling ([fffecc8](https://github.com/storacha/tg-miniapp/commit/fffecc8d4142828d13b14680100c75e77304efb8))
- ok so pnpm might be right now ([0315f3b](https://github.com/storacha/tg-miniapp/commit/0315f3b1e993daa4b5b155ecebaa914f678b5cd0))
- one more attempt ([787952c](https://github.com/storacha/tg-miniapp/commit/787952c1bc9994c5f614bf40f7ab5361bb61a37e))
- one more try ([34ab4ba](https://github.com/storacha/tg-miniapp/commit/34ab4ba3a5795c102f799cd73911e4a2a77d79cc))
- one more try ([fbe7584](https://github.com/storacha/tg-miniapp/commit/fbe7584e0cf9f3c295548f13611bdce4bcb30f35))
- remove line that broke build ([39a4f1e](https://github.com/storacha/tg-miniapp/commit/39a4f1efcb6eaa725f27d8f63cf50435d11b5d45))
- set working directory in step directly ([c19409b](https://github.com/storacha/tg-miniapp/commit/c19409b7817bf16911bc9568263095c90f39308b))
- telegram auth needs telegram provider ([7a77e8e](https://github.com/storacha/tg-miniapp/commit/7a77e8e36ae1e033f23954038b7a720f89390280))
- try using a different output capture action that supports working directories ([d70077c](https://github.com/storacha/tg-miniapp/commit/d70077c97ffbf8e58e77676157095e2c5e555b2e))
- try using pnpm rather than npx in hopes it respects the working directory ([332e1e1](https://github.com/storacha/tg-miniapp/commit/332e1e1d35a50a85a3a00b8059142639b0444893))
- typos ([#21](https://github.com/storacha/tg-miniapp/issues/21)) ([e91c697](https://github.com/storacha/tg-miniapp/commit/e91c6977809f947095c23ee10aaf807f35db7a36))

### Other Changes

- add linting, delint code ([75152a4](https://github.com/storacha/tg-miniapp/commit/75152a42cd04ac0411aad927eb38a346a04d69fc))
- add test script ([c2b8b15](https://github.com/storacha/tg-miniapp/commit/c2b8b156bb901c1969c749efaf2c572ba7787c4a))
- clean up ([c5ae6f3](https://github.com/storacha/tg-miniapp/commit/c5ae6f313f98272008171e56f86bae6fe2e1c1ee))
- lock.yaml ([4cdd509](https://github.com/storacha/tg-miniapp/commit/4cdd509234b880f577767367c6749f99f42ffddf))
- **readme:** update readme doc ([01cbfa4](https://github.com/storacha/tg-miniapp/commit/01cbfa49af826fefce96a92dc810f8f43b591f62))
- resolve conflict ([ecfe11f](https://github.com/storacha/tg-miniapp/commit/ecfe11fa79c7d1617130e4d9fb0f4daf5d1449ba))
