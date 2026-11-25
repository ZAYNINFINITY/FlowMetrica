function info = start_rest_service()
%START_REST_SERVICE Expose FlowMetrica functions over a MATLAB REST service.
%   Run this in DESKTOP MATLAB (MATLAB Online cannot host a REST Function Service).
%   Copy the printed values into the Node server environment and restart it.
%   Requires a MATLAB release that supports restFunctionService.

    projectRoot = fileparts(fileparts(mfilename('fullpath')));
    addpath(genpath(fullfile(projectRoot, 'matlab')));

    functionNames = ["solve_network_flow", "analyze_anomaly", "investigate_incident"];
    service = restFunctionService("FlowMetrica", functionNames);
    info = start(service);

    fprintf('\n=== FlowMetrica MATLAB bridge ===\n');
    fprintf('Set these environment variables for the Node server:\n\n');
    fprintf('  MATLAB_REST_URL=%s\n', info.RequestUrl);
    fprintf('  MATLAB_REST_TOKEN=%s\n', info.RESTPersonalAccessToken);
    fprintf('  MATLAB_REST_CA=%s\n', info.CertificateLocation);
    fprintf('\nKeep the token private: never commit it or paste it into a screenshot.\n');
    fprintf('The bridge is live only after /api/execute receives a successful response.\n\n');
end
