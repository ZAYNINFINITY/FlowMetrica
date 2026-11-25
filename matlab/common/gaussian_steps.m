function result = gaussian_steps(augmented)
%GAUSSIAN_STEPS Record every elementary row operation of Gauss-Jordan elimination.
%   Each step stores the operation text, the teaching reason and the matrix
%   immediately after that operation.

    [rowCount, columnCount] = size(augmented);
    M = augmented;
    steps = struct('operation', {}, 'reason', {}, 'matrix', {});
    pivotRow = 1;

    steps(end + 1) = struct('operation', 'Initial augmented matrix', ...
        'reason', 'Start with the coefficient matrix joined to the constants vector.', ...
        'matrix', M);

    for column = 1:(columnCount - 1)
        if pivotRow > rowCount
            break;
        end

        found = find(abs(M(pivotRow:rowCount, column)) > 1e-9, 1);
        if isempty(found)
            continue;
        end
        candidate = found + pivotRow - 1;

        if candidate ~= pivotRow
            M([pivotRow candidate], :) = M([candidate pivotRow], :);
            steps(end + 1) = struct('operation', ...
                sprintf('R%d <-> R%d', pivotRow, candidate), ...
                'reason', 'Move a nonzero entry into the pivot position.', ...
                'matrix', M);
        end

        pivot = M(pivotRow, column);
        if abs(pivot - 1) > 1e-9
            M(pivotRow, :) = M(pivotRow, :) / pivot;
            steps(end + 1) = struct('operation', ...
                sprintf('R%d <- (1/%g) R%d', pivotRow, pivot, pivotRow), ...
                'reason', 'Normalize the pivot to 1.', ...
                'matrix', M);
        end

        for row = 1:rowCount
            if row == pivotRow
                continue;
            end
            factor = M(row, column);
            if abs(factor) < 1e-9
                continue;
            end
            M(row, :) = M(row, :) - factor * M(pivotRow, :);
            steps(end + 1) = struct('operation', ...
                sprintf('R%d <- R%d - (%g) R%d', row, row, factor, pivotRow), ...
                'reason', 'Clear this column from the remaining rows.', ...
                'matrix', M);
        end

        pivotRow = pivotRow + 1;
    end

    % Show a contradiction as [0 0 | 1], i.e. "0 = 1".
    for row = 1:rowCount
        constant = M(row, columnCount);
        if all(abs(M(row, 1:columnCount - 1)) < 1e-9) && abs(constant) > 1e-9
            M(row, :) = M(row, :) / constant;
            steps(end + 1) = struct('operation', ...
                sprintf('R%d <- (1/%g) R%d', row, constant, row), ...
                'reason', 'Expose the contradiction as 0 = 1.', ...
                'matrix', M);
        end
    end

    result = struct('rref', M, 'steps', steps);
end
