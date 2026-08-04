import sys

with open("styles.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

# keep up to 1472 lines
lines = lines[:1472]

with open("styles.css", "w", encoding="utf-8") as f:
    f.writelines(lines)
