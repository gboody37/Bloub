import sys

with open('src/lib/pdf/arabic-bidi.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix the sorting inside processPageTextContent to be RTL for horizontal
# Replace `return a.left - b.left;` with `return b.left - a.left;`
sort_target = """    rawItems.sort((a, b) => {
      const yDiff = a.top - b.top;
      if (Math.abs(yDiff) > 4) {
        return yDiff;
      }
      return a.left - b.left;
    });"""

sort_replace = """    rawItems.sort((a, b) => {
      const yDiff = a.top - b.top;
      if (Math.abs(yDiff) > 4) {
        return yDiff;
      }
      // Arabic is RTL, so right-most items should come first if on same baseline
      return b.left - a.left;
    });"""

if sort_target in code:
    code = code.replace(sort_target, sort_replace)
    print("Fixed RTL horizontal sorting")


# 2. Fix the clustering logic to prevent merging across large horizontal gaps
cluster_target = """      if (currentLineItems.length === 0) {
        currentLineItems.push(item);
        currentLineTop = item.top;
        currentLineHeight = item.height;
      } else if (Math.abs(item.top - currentLineTop) <= yTolerance) {
        currentLineItems.push(item);
        currentLineHeight = Math.max(currentLineHeight, item.height);
      } else {"""

cluster_replace = """      if (currentLineItems.length === 0) {
        currentLineItems.push(item);
        currentLineTop = item.top;
        currentLineHeight = item.height;
      } else if (Math.abs(item.top - currentLineTop) <= yTolerance) {
        // Prevent merging items across large horizontal gaps (columns)
        const lastItem = currentLineItems[currentLineItems.length - 1];
        // In RTL, item is to the left of lastItem. 
        // Horizontal gap = lastItem.left - (item.left + item.width)
        const hGap = Math.abs(lastItem.left - (item.left + item.width));
        const maxGap = Math.max(20, item.fontSize * 3);
        
        // If the items are physically too far apart, break the line
        // NOTE: we also check LTR gap just in case: item.left - (lastItem.left + lastItem.width)
        const ltrGap = Math.abs(item.left - (lastItem.left + lastItem.width));
        
        if (hGap > maxGap && ltrGap > maxGap) {
          lines.push(buildProcessedLine(currentLineItems));
          currentLineItems = [item];
          currentLineTop = item.top;
          currentLineHeight = item.height;
        } else {
          currentLineItems.push(item);
          // Only increase line height if the item isn't ridiculously tall (e.g. watermark borders)
          if (item.height < currentLineHeight * 2.5) {
            currentLineHeight = Math.max(currentLineHeight, item.height);
          }
        }
      } else {"""

if cluster_target in code:
    code = code.replace(cluster_target, cluster_replace)
    print("Fixed horizontal column clustering")


# 3. Fix the "TOO thick" issue in buildProcessedLine
# Find buildProcessedLine and limit the height
build_target = """  function buildProcessedLine(items: ProcessedTextItem[]): ProcessedTextLine {
    // Sort items on the line geometrically from left to right
    items.sort((a, b) => a.left - b.left);"""

build_replace = """  function buildProcessedLine(items: ProcessedTextItem[]): ProcessedTextLine {
    // Sort items on the line geometrically from left to right
    items.sort((a, b) => a.left - b.left);"""

# I need to target the height calculation inside buildProcessedLine
height_target = """    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      minLeft = Math.min(minLeft, item.left);
      minTop = Math.min(minTop, item.top);
      maxRight = Math.max(maxRight, item.left + item.width);
      maxBottom = Math.max(maxBottom, item.top + item.height);"""

height_replace = """    // First pass to find median/base height to reject outliers (watermarks/borders)
    const heights = items.map(i => i.height).sort((a, b) => a - b);
    const baseHeight = heights[Math.floor(heights.length / 2)] || 12;
    const maxHeightAllowed = baseHeight * 1.8;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      minLeft = Math.min(minLeft, item.left);
      minTop = Math.min(minTop, item.top);
      maxRight = Math.max(maxRight, item.left + item.width);
      
      // Prevent "TOO thick" selection boxes by clamping item height
      const safeHeight = Math.min(item.height, maxHeightAllowed);
      maxBottom = Math.max(maxBottom, item.top + safeHeight);"""

if height_target in code:
    code = code.replace(height_target, height_replace)
    print("Fixed thickness/height issues")

# 4. Now, we MUST sort the final lines into logical column order to fix text selection jumping!
# Right now, `processPageTextContent` just returns `lines`.
# We need to sort `lines` so that columns are read correctly.
# A simple heuristic: group lines into overlapping vertical columns.
return_target = """    if (currentLineItems.length > 0) {
      lines.push(buildProcessedLine(currentLineItems));
    }
  
    return lines;
  }"""

return_replace = """    if (currentLineItems.length > 0) {
      lines.push(buildProcessedLine(currentLineItems));
    }
  
    // 3. Final DOM Reading Order Sorting (Column Detection)
    // To prevent text selection from jumping horizontally between columns on every line,
    // we sort the finalized lines primarily into vertical columns (Right-to-Left),
    // and secondarily top-to-bottom within the column.
    lines.sort((a, b) => {
      // Check if lines overlap horizontally
      const overlap = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
      
      if (overlap === 0) {
        // No horizontal overlap = they are in different columns.
        // For Arabic (RTL), the right-most column should come FIRST in the DOM.
        return b.left - a.left;
      }
      
      // They overlap horizontally (same column), sort top-to-bottom
      return a.top - b.top;
    });

    return lines;
  }"""

if return_target in code:
    code = code.replace(return_target, return_replace)
    print("Fixed column DOM ordering")


with open('src/lib/pdf/arabic-bidi.ts', 'w', encoding='utf-8') as f:
    f.write(code)
