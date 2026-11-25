function export_fixtures()
%EXPORT_FIXTURES Run the MATLAB functions and overwrite the saved fixtures.
%   Run this in MATLAB Online after opening the FlowMetrica project folder.
%   It reads the same scenario definitions the app uses, executes the matching
%   MATLAB function, and writes genuine MATLAB output into server/data/fixtures.
%
%   After this script runs, the app automatically relabels results as
%   "Saved MATLAB Result" because executionEngine becomes "MATLAB" and
%   matlabExportStatus becomes "complete".

    projectRoot = fileparts(fileparts(mfilename('fullpath')));
    addpath(genpath(fullfile(projectRoot, 'matlab')));

    scenarioDir = fullfile(projectRoot, 'server', 'data', 'scenarios');
    fixtureDir = fullfile(projectRoot, 'server', 'data', 'fixtures');
    if ~exist(fixtureDir, 'dir')
        mkdir(fixtureDir);
    end

    files = dir(fullfile(scenarioDir, '*.json'));

    for k = 1:numel(files)
        scenario = jsondecode(fileread(fullfile(files(k).folder, files(k).name)));
        operation = scenario.execution.operation;
        input = scenario.execution.input;

        switch operation
            case 'solve_network_flow'
                output = solve_network_flow(input.matrix, input.vector);
            case 'investigate_incident'
                output = investigate_incident(input.matrix, input.vector);
            case 'analyze_anomaly'
                output = analyze_anomaly(input.stages);
            otherwise
                error('Unsupported operation: %s', operation);
        end

        metadata = struct( ...
            'verificationStatus', 'matlab_verified', ...
            'executionEngine', 'MATLAB', ...
            'matlabVersion', version, ...
            'generatedAt', datestr(now, 'yyyy-mm-ddTHH:MM:SSZ'), ...
            'matlabExportStatus', 'complete', ...
            'method', 'Executed the corresponding MATLAB function in MATLAB.');

        fixture = struct( ...
            'fixtureVersion', '1.0.0', ...
            'scenarioId', scenario.id, ...
            'operation', operation, ...
            'functionName', operation, ...
            'input', input, ...
            'output', output, ...
            'metadata', metadata);

        target = fullfile(fixtureDir, sprintf('%s.%s.json', scenario.id, operation));
        fid = fopen(target, 'w');
        fprintf(fid, '%s\n', jsonencode(fixture));
        fclose(fid);

        fprintf('Exported %s\n', target);
    end
end
