function result = analyze_anomaly(stages)
%ANALYZE_ANOMALY Module 2 entry point: analyse normal, failed and corrected systems.
%   stages is a struct array with fields id, matrix and vector.

    count = numel(stages);
    entries = cell(1, count);

    for k = 1:count
        stage = stages(k);
        solved = solve_system(stage.matrix, stage.vector);
        solved.id = stage.id;
        entries{k} = solved;
    end

    result = struct('stages', {entries});
end
