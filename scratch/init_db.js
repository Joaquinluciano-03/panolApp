import { checkAndInitDb } from '../lib/sheets.js';
checkAndInitDb().then(() => console.log('DB INIT OK')).catch(console.error);
