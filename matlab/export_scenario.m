function export_scenario(scenarioId)
%EXPORT_SCENARIO Turn one staged ChatGPT scenario into a MATLAB-signed fixture.
%   Run this in MATLAB Online after adding the project folder to the path:
%       addpath(genpath(pwd))
%       export_scenario('incident_hostel_core_saturation_01')
%
%   The staged file lives in matlab/incoming/<id>.json. MATLAB executes the
%   matching entry point, writes server/data/fixtures/<id>.<operation>.json,
%   then promotes the scenario into server/data/scenarios. Promotion happens
%   only after a genuine MATLAB output exists, so the app never shows a result
%   that MATLAB did not produce.

    narginchk(1, 1);
    validateattributes(scenarioId, {'char', 'string'}, {'scalartext'});
    scenarioId = char(scenarioId);

    projectRoot = fileparts(fileparts(mfilename('fullpath')));
    addpath(genpath(fullfile(projectRoot, 'matlab')));

    incomingPath = fullfile(projectRoot, 'matlab', 'incoming', sprintf('%s.json', scenarioId));
    if ~exist(incomingPath, 'file')
        error('Staged scenario not found: %s', incomingPath);
    end

    scenario = jsondecode(fileread(incomingPath));
    assertStagedScenario(scenario, scenarioId);

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

    % Build structs field by field. struct('steps', {}) collapses to [] in jsonencode.
    metadata = struct();
    metadata.verificationStatus = 'matlab_verified';
    metadata.executionEngine = 'MATLAB';
    metadata.matlabVersion = version;
    metadata.generatedAt = datestr(now, 'yyyy-mm-ddTHH:MM:SSZ');
    metadata.matlabExportStatus = 'complete';
    metadata.method = 'Executed the staged scenario input in MATLAB.';

    fixture = struct();
    fixture.fixtureVersion = '1.0.0';
    fixture.scenarioId = scenarioId;
    fixture.operation = operation;
    fixture.functionName = operation;
    fixture.input = input;
    fixture.output = output;
    fixture.metadata = metadata;

    fixtureDir = fullfile(projectRoot, 'server', 'data', 'fixtures');
    if ~exist(fixtureDir, 'dir')
        mkdir(fixtureDir);
    end
    fixturePath = fullfile(fixtureDir, sprintf('%s.%s.json', scenarioId, operation));
    writeJson(fixturePath, fixture);

    scenarioDir = fullfile(projectRoot, 'server', 'data', 'scenarios');
    promotedPath = fullfile(scenarioDir, sprintf('%s.json', scenarioId));
    writeJson(promotedPath, scenario);

    fprintf('Exported %s\n', fixturePath);
    fprintf('Promoted %s\n', promotedPath);
end

function assertStagedScenario(scenario, expectedId)
    if ~isstruct(scenario)
        error('Staged scenario must decode to a struct.');
    end
    if ~isfield(scenario, 'id') || ~strcmp(char(scenario.id), expectedId)
        error('Staged scenario id must match the requested id.');
    end
    if ~isfield(scenario, 'module') || ~any(strcmp(char(scenario.module), {'module1', 'module2', 'module3'}))
        error('Staged scenario has an unknown module.');
    end
    if ~isfield(scenario, 'execution') || ~isstruct(scenario.execution)
        error('Staged scenario must contain an execution object.');
    end
    if ~isfield(scenario.execution, 'operation') || ~isfield(scenario.execution, 'input')
        error('Staged scenario execution needs an operation and an input.');
    end
end

function writeJson(targetPath, value)
    fid = fopen(targetPath, 'w');
    if fid < 0
        error('Cannot write %s', targetPath);
    end
    fprintf(fid, '%s\n', jsonencode(value));
    fclose(fid);
end
