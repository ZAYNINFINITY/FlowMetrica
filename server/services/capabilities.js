/**
 * Honest capability flags. A service that is not wired up must say so plainly;
 * the UI turns these strings into user-facing status messages.
 */

export const APP_VERSION = '0.2.0-integrations';

export const LIVE_MATLAB_REASON =
  'MATLAB Online has no supported external execution API. Live MATLAB results require desktop MATLAB with a REST Function Service; connect it from Settings → Execution engine.';

export const MEASUREMENT_REASON =
  'Live Ookla measurement is available when the server can reach speedtest.net. Predefined analysis works without it.';

export const OPENROUTER_REASON =
  'Custom AI investigation is outside this MVP. Predefined incidents and template reports work offline.';

export const MATLAB_SETUP_STEPS = [
  'Use desktop MATLAB with REST Function Service support (MATLAB Online cannot host this service).',
  'In MATLAB, run: addpath(genpath("matlab")) then info = start_rest_service().',
  'In FlowMetrica Settings → Execution engine, paste RequestUrl, token and CA path, then Connect.',
  'The token stays in server memory only. A live result is claimed after a successful REST call.',
];

export const MATLAB_SETUP_CODE = [
  '% Run in desktop MATLAB, from the FlowMetrica project folder:',
  'addpath(genpath(fullfile(pwd, "matlab")))',
  'info = start_rest_service()',
  '',
  '% Then paste these into FlowMetrica Settings → Execution engine:',
  '%   Request URL  = info.RequestUrl',
  '%   Token        = info.RESTPersonalAccessToken',
  '%   CA path      = info.CertificateLocation',
].join('\n');

export const MATLAB_ONLINE_HANDOFF = [
  'Open https://matlab.mathworks.com/ with your free account (20 hours/month).',
  'Upload this project folder, then run: addpath(genpath("matlab")); export_fixtures',
  'Download the exported JSON files and import them below; each one is verified before use.',
  'Imported results are labelled "Saved MATLAB Result". MATLAB Online does not provide live execution.',
];
