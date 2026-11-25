import {
  APP_VERSION,
  LIVE_MATLAB_REASON,
  MEASUREMENT_REASON,
  MATLAB_ONLINE_HANDOFF,
  MATLAB_SETUP_CODE,
  MATLAB_SETUP_STEPS,
  OPENROUTER_REASON,
} from './capabilities.js';

export function getHealth({ fixtureStore, scenarioStore, matlabBridge, measurementStore, executionMode }) {
  const matlab = matlabBridge?.status() ?? {
    configured: false,
    available: false,
    reason: LIVE_MATLAB_REASON,
  };
  const measurementAvailable = measurementStore?.isAvailable() ?? false;

  return {
    status: 'ok',
    appVersion: APP_VERSION,
    services: {
      matlabLive: {
        available: matlab.available,
        configured: matlab.configured,
        enabled: executionMode?.get().matlabLiveEnabled ?? false,
        verifiedAt: matlab.verifiedAt,
        label: 'MATLAB live execution',
        reason: matlab.reason,
      },
      savedResults: {
        available: fixtureStore.size > 0,
        count: fixtureStore.size,
        problems: fixtureStore.problems,
      },
      scenarios: { available: scenarioStore.count > 0, count: scenarioStore.count },
      networkMeasurement: {
        available: measurementAvailable,
        label: 'Live measurement',
        reason: measurementAvailable ? MEASUREMENT_REASON : 'Ookla runner is not installed on this server.',
      },
      openRouter: { available: false, label: 'AI assistance', reason: OPENROUTER_REASON },
    },
    setup: {
      matlab: {
        steps: MATLAB_SETUP_STEPS,
        code: MATLAB_SETUP_CODE,
        matlabOnlineHandoff: MATLAB_ONLINE_HANDOFF,
      },
    },
  };
}
