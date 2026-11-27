function flowmetrica_worker(apiBase, token, maxLoops)
%FLOWMETRICA_WORKER Run FlowMetrica jobs inside MATLAB Online.
%   MATLAB Online cannot be called from outside, but it can make outbound HTTPS
%   requests. This worker polls the FlowMetrica API, solves only the predefined
%   scenario input it receives, and posts the verified result back.
%
%   Usage (paste in MATLAB Online Command Window):
%       addpath(genpath(pwd)); flowmetrica_worker('<apiBase>', '<token>')
%
%   Press Ctrl-C to stop. The token is short-lived and is never written to disk.

    narginchk(2, 3);
    if nargin < 3
        maxLoops = 1000;
    end
    validateattributes(apiBase, {'char', 'string'}, {'scalartext'});
    validateattributes(token, {'char', 'string'}, {'scalartext'});
    validateattributes(maxLoops, {'numeric'}, {'scalar', 'integer', 'positive'});

    apiBase = strtrim(char(apiBase));
    token = strtrim(char(token));
    apiBase = regexprep(apiBase, '/+$', '');

    projectRoot = fileparts(mfilename('fullpath'));
    addpath(genpath(projectRoot));

    opts = weboptions( ...
        'HeaderFields', {'Authorization', ['Bearer ' token]}, ...
        'MediaType', 'application/json');

    fprintf('FlowMetrica worker connected to %s\n', apiBase);
    fprintf('Polling every 2 seconds. Press Ctrl-C to stop.\n');

    submitted = 0;
    for poll = 1:maxLoops
        try
            cacheBuster = int64(now * 86400000);
            envelope = webread(sprintf('%s/next?_=%d', apiBase, cacheBuster), opts);
            if isfield(envelope, 'job') && ~isempty(envelope.job)
                job = envelope.job;
                fprintf('Solving %s (%s)...\n', job.id, job.operation);
                try
                    output = solve_worker_job(job);
                    body = struct('jobId', job.id, 'output', output);
                    webwrite([apiBase '/result'], jsonencode(body), opts);
                    submitted = submitted + 1;
                    fprintf('Submitted result for %s\n', job.id);
                catch cause
                    body = struct('jobId', job.id, 'error', message(cause));
                    webwrite([apiBase '/result'], jsonencode(body), opts);
                    fprintf('Reported MATLAB error for %s: %s\n', job.id, message(cause));
                end
            end
        catch cause
            fprintf('Worker request failed: %s\n', message(cause));
        end
        pause(2);
    end

    fprintf('Worker stopped after %d polls; %d result(s) submitted.\n', maxLoops, submitted);
end

function output = solve_worker_job(job)
% Only operations already exposed by the shared execution interface are allowed.
    operation = char(job.operation);
    data = job.input;

    switch operation
        case 'solve_network_flow'
            output = solve_network_flow(to_matrix(data.matrix), to_vector(data.vector));
        case 'investigate_incident'
            output = investigate_incident(to_matrix(data.matrix), to_vector(data.vector));
        case 'analyze_anomaly'
            stages = data.stages;
            if iscell(stages)
                stages = [stages{:}];
            end
            for index = 1:numel(stages)
                stages(index).matrix = to_matrix(stages(index).matrix);
                stages(index).vector = to_vector(stages(index).vector);
            end
            output = analyze_anomaly(stages);
        otherwise
            error('Unsupported operation: %s', operation);
    end
end

function value = to_matrix(value)
% jsondecode returns numeric matrices for rectangular arrays; tolerate cells too.
    if iscell(value)
        value = cell2mat(value);
    end
    value = double(value);
end

function value = to_vector(value)
    if iscell(value)
        value = cell2mat(value);
    end
    value = double(value);
    value = value(:);
end
