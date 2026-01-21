import { createDesignHandler } from '../server/design-book.mjs';
// Hosted functions require the server-only environment key; local key files are not bundled.
export default createDesignHandler();
