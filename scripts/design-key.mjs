import {readFile} from 'node:fs/promises';
// Owner-only helper. Never run this command in CI logs or a public terminal.
console.log((await readFile('.secrets/design-book.key','utf8')).trim());
