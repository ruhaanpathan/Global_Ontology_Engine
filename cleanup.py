import sys

with open(r'D:\Ruhaan\Indian_Inoovates\goe-engine.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the boundary after updateTickerFromLive function closes
end_of_ticker_fn = content.find("  ).join('');\n}\n")
if end_of_ticker_fn == -1:
    end_of_ticker_fn = content.find("  ).join('');\r\n}\r\n")

# Find start of STRATEGY VIEW section
strategy_marker = '// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 STRATEGY VIEW \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550'
strategy_idx = content.find(strategy_marker)

print(f"end_of_ticker_fn at char: {end_of_ticker_fn}")
print(f"strategy_marker at char: {strategy_idx}")

if end_of_ticker_fn == -1 or strategy_idx == -1:
    print("ERROR: markers not found")
    sys.exit(1)

# Figure out where to cut: right after the closing } of updateTickerFromLive
cut_start = content.find('\n', end_of_ticker_fn + len("  ).join('');\n}\n")) + 1

print(f"cut range: {cut_start} to {strategy_idx}, removing {strategy_idx - cut_start} chars")

clean = content[:end_of_ticker_fn + len("  ).join('');\n}\n")] + '\n\n' + content[strategy_idx:]

with open(r'D:\Ruhaan\Indian_Inoovates\goe-engine.js', 'w', encoding='utf-8') as f:
    f.write(clean)

before = content.count('\n')
after = clean.count('\n')
print(f"Done! Lines: {before} -> {after} (removed {before-after})")
