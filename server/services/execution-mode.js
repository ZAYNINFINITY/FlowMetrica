/**
 * Runtime opt-in for live MATLAB execution.
 *
 * It is deliberately in-memory only: a server restart returns to OFF, so an old
 * browser toggle can never silently keep calling MATLAB after credentials change.
 * Credentials stay in the server process environment and are never exposed here.
 */
export function createExecutionMode() {
  let matlabLiveEnabled = false;

  return {
    get: () => ({ matlabLiveEnabled }),
    setMatlabLive: (value) => {
      matlabLiveEnabled = Boolean(value);
      return { matlabLiveEnabled };
    },
  };
}
