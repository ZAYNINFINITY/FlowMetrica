function result = solve_system(A, b)
%SOLVE_SYSTEM Solve A*x = b and return the app's complete result shape.
%   The REST bridge serialises this struct directly into /api/execute, so its
%   field names must stay aligned with server/services/executor.js.

    augmented = [A, b(:)];
    [R, pivots] = rref(augmented);
    variableCount = size(A, 2);

    zeroLeft = all(abs(R(:, 1:variableCount)) < 1e-9, 2);
    inconsistent = any(zeroLeft & abs(R(:, variableCount + 1)) > 1e-9);

    if inconsistent
        classification = 'no_solution';
        solution = [];
    elseif numel(pivots) == variableCount
        classification = 'unique';
        solution = zeros(variableCount, 1);
        for k = 1:numel(pivots)
            solution(pivots(k)) = R(k, variableCount + 1);
        end
    else
        classification = 'infinite_solutions';
        solution = [];
    end

    traced = gaussian_steps(augmented);
    R = traced.rref;
    lines = parametric_form(R, pivots, variableCount);

    result = struct( ...
        'classification', classification, ...
        'consistent', ~inconsistent, ...
        'rref', R, ...
        'rank', numel(pivots), ...
        'variableCount', variableCount, ...
        'pivotColumns', pivots - 1, ...   % the app uses zero-based indices
        'solution', solution, ...
        'steps', {traced.steps}, ...
        'parametricForm', {lines});
end
