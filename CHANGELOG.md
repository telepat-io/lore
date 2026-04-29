# Changelog

## [0.1.1](https://github.com/telepat-io/lore/compare/lore-v0.1.0...lore-v0.1.1) (2026-04-29)


### Features

* Add comprehensive tests for core functionality and improve type safety ([3652dcb](https://github.com/telepat-io/lore/commit/3652dcb65bc9f07e8dbc4ba5a81386ca93a1a248))
* add diagnostics for linting process including error and warning reporting ([009be5e](https://github.com/telepat-io/lore/commit/009be5e257eee7c96cfe31963e6233ffc1cf0143))
* add integration tests for startMcpServer and lint-maintenance tools ([b1ec182](https://github.com/telepat-io/lore/commit/b1ec1823ee68c528b7976658852d233a19fd3fc2))
* add list_gaps and list_ambiguous utilities; update MCP_TOOLS and enhance documentation ([4cf1704](https://github.com/telepat-io/lore/commit/4cf17040b33674581cb752d37e5ea565bf157817))
* add query normalization and new MCP utility functions for duplicate checking and raw tag listing ([01b2956](https://github.com/telepat-io/lore/commit/01b2956dd867faef71edb72b0b88afb103b26faa))
* add rebuild_index and list_orphans utilities; enhance tests for duplicate checking and metadata summarization ([0057aa1](https://github.com/telepat-io/lore/commit/0057aa19a36d7c242334045628d0fb972935f477))
* add session ingestion command and framework adapters ([10ca74c](https://github.com/telepat-io/lore/commit/10ca74c221a39d6baf9a1bf28e23c49d07c3b70f))
* enhance compile and ingest processes with content hashing and manifest updates ([6992d19](https://github.com/telepat-io/lore/commit/6992d19a33157438d9fdf9413984f31aec611bde))
* enhance conversation export ingestion and normalization to transcript markdown ([694f870](https://github.com/telepat-io/lore/commit/694f870a9f55e61994dfbb0c436ec5e337b65a03))
* enhance documentation with recent updates on ingestion, indexing, and MCP utilities ([a49f19e](https://github.com/telepat-io/lore/commit/a49f19e0213ffa90ff1e4f092b94700ed822c658))
* enhance ingest and indexing processes with folder-based tags, duplicate detection, and manifest repair ([b898cc4](https://github.com/telepat-io/lore/commit/b898cc446b2c7cdcb6fab82da401930ec41b3185))
* enhance secretStore with keytar loading and error handling ([e92ad19](https://github.com/telepat-io/lore/commit/e92ad19e82eab178a0d150a03350c2d8ee0f1163))
* enhance tests for concepts extraction and indexing, add diagnostics for linting process ([4d982d4](https://github.com/telepat-io/lore/commit/4d982d41567ae8528ee1f35eff9f04466a493838))
* implement autoCompile feature in watch command with event notifications ([1868e3e](https://github.com/telepat-io/lore/commit/1868e3e6efbf5dd64dca8e9c092480e6e7c60ac4))
* implement compile lock mechanism to prevent concurrent compile processes ([1436d98](https://github.com/telepat-io/lore/commit/1436d981e6a68cb1d51646b84fb663f777e36a42))
* implement concepts extraction and indexing functionality with tests ([4917461](https://github.com/telepat-io/lore/commit/4917461cdfb94e587d727bbeb696f1c964f14380))
* implement graph quality guardrail to filter low-signal wiki-link targets during index rebuild ([8f703da](https://github.com/telepat-io/lore/commit/8f703dab6d2167a02d9da4372e30a5ca753e6c68))
* implement run logging for ingest, compile, and query commands with structured JSONL output ([bc8da1a](https://github.com/telepat-io/lore/commit/bc8da1a4691a3f11a62a2b150bb093c0f4103192))
* initial commit ([0f56440](https://github.com/telepat-io/lore/commit/0f56440d043b7c52044dfc53d8efdc8ad2ae7ecb))
* update documentation to reflect dark-mode support and enhance theme behavior ([c4e75bf](https://github.com/telepat-io/lore/commit/c4e75bff98aacd3046509029a1449c96ac197589))
* update documentation with new features including hash-based incremental compile, compile lock safety, and enhanced lint diagnostics ([5ea8f78](https://github.com/telepat-io/lore/commit/5ea8f78b291d5bedb1d78f89f74a836edafc5f52))
* update maxTokens handling and documentation for optional configuration ([b7a7db8](https://github.com/telepat-io/lore/commit/b7a7db85b304327af392dbcc82c66d08cb55c76e))


### Bug Fixes

* ensure unblockCompile is correctly typed to prevent runtime errors ([1d1063d](https://github.com/telepat-io/lore/commit/1d1063d880d2484a16def2e0cf8ef8193995432e))
