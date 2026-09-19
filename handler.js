/* ============================================================
   handler.js — Yandex Cloud Functions Serverless Handler
   AutoElectro CRM & Landing v2.2.0
   Bridges Yandex Cloud Functions HTTP events to Express app
============================================================ */
'use strict';

const serverless = require('serverless-http');
const app = require('./api/index');

// Wrap Express app with binary types support
const serverlessHandler = serverless(app, {
  binary: [
    'image/*',
    'font/*',
    'application/octet-stream',
    'application/pdf'
  ]
});

module.exports.handler = async (event, context) => {
  // Normalize path for serverless-http from Yandex Cloud Functions
  if (event && event.url) {
    const cleanPath = event.url.split('?')[0] || '/';
    event.path = cleanPath;
    event.requestPath = cleanPath;
    event.rawPath = cleanPath;
  }
  return await serverlessHandler(event, context);
};
