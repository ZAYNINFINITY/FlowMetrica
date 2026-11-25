function lines = parametric_form(R, pivots, variableCount)
%PARAMETRIC_FORM Describe an infinite solution set in the app's string format.
%   Returns an empty cell array for unique or inconsistent systems.

    lines = {};
    zeroLeft = all(abs(R(:, 1:variableCount)) < 1e-9, 2);
    inconsistent = any(zeroLeft & abs(R(:, variableCount + 1)) > 1e-9);
    if inconsistent || numel(pivots) == variableCount
        return;
    end

    freeColumns = setdiff(1:variableCount, pivots);

    for rowIndex = 1:numel(pivots)
        terms = {};
        for column = freeColumns
            coefficient = R(rowIndex, column);
            if abs(coefficient) < 1e-9
                continue;
            end
            if coefficient < 0
                sign = '+ ';
            else
                sign = '- ';
            end
            terms{end + 1} = sprintf('%s%gx%d', sign, abs(coefficient), column);
        end

        line = sprintf('x%d = %g', pivots(rowIndex), R(rowIndex, variableCount + 1));
        if ~isempty(terms)
            line = [line ' ' strjoin(terms, ' ')];
        end
        lines{end + 1} = line;
    end

    for index = 1:numel(freeColumns)
        lines{end + 1} = sprintf('x%d = t%d  (free parameter)', freeColumns(index), index);
    end
end
